// Bờm Chăm — Onboarding Wizard
// 5-step setup in Vietnamese

(function () {
  'use strict';

  var GW_HOST = location.hostname || '127.0.0.1';
  var GW_PORT = location.port || '18789';
  var WS_URL = 'ws://' + GW_HOST + ':' + GW_PORT;

  var ws = null;
  var connected = false;
  var pendingRequests = {};
  var requestId = 0;
  var connectSent = false;

  var currentStep = 1;
  var totalSteps = 5;

  // Wizard data
  var wizardData = {
    elderName: 'Bà Nội',
    elderAge: 90,
    mobility: 'bedridden',
    hearing: 'hard_of_hearing',
    contacts: [],
    haUrl: '',
    haToken: '',
    room: 'grandma_room'
  };

  // ─── WebSocket (reuse same protocol as Family PWA) ────────────
  function connect() {
    ws = new WebSocket(WS_URL);
    ws.onopen = function () {
      connectSent = false;
      setTimeout(function () {
        if (!connectSent) sendConnect();
      }, 1500);
    };
    ws.onmessage = function (ev) {
      var data;
      try { data = JSON.parse(ev.data); } catch (e) { return; }
      if (data.type === 'event' && data.event === 'connect.challenge') {
        sendConnect();
        return;
      }
      if (data.type === 'res') {
        var pending = pendingRequests[data.id];
        if (pending) {
          delete pendingRequests[data.id];
          if (data.ok) pending.resolve(data.payload);
          else pending.reject(data.error || { message: 'failed' });
        }
      }
    };
    ws.onclose = function () {
      connected = false;
      setTimeout(connect, 3000);
    };
    ws.onerror = function () {};
  }

  function sendConnect() {
    if (connectSent) return;
    connectSent = true;
    request('connect', {
      minProtocol: 3, maxProtocol: 3,
      client: { id: 'family-wizard', version: '1.0.0', platform: 'web', mode: 'webchat' },
      role: 'operator',
      scopes: ['operator.admin'],
      caps: []
    }).then(function () {
      connected = true;
      checkExistingProfiles();
    }).catch(function () {});
  }

  function request(method, params) {
    return new Promise(function (resolve, reject) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return reject(new Error('not connected'));
      var id = 'wizard-' + (++requestId);
      pendingRequests[id] = { resolve: resolve, reject: reject };
      ws.send(JSON.stringify({ type: 'req', id: id, method: method, params: params }));
      setTimeout(function () {
        if (pendingRequests[id]) { delete pendingRequests[id]; reject(new Error('timeout')); }
      }, 10000);
    });
  }

  // ─── Check if already configured ─────────────────────────────
  function checkExistingProfiles() {
    request('memory.search', { query: 'eldercare_profiles', limit: 1 })
      .then(function (result) {
        var items = (result && result.items) || (result && result.results) || [];
        if (items.length > 0) {
          var profiles = items[0].value || items[0];
          if (typeof profiles === 'string') {
            try { profiles = JSON.parse(profiles); } catch (e) { profiles = null; }
          }
          if (profiles && profiles.elders && profiles.elders.length > 0) {
            // Already configured — redirect to family dashboard
            location.href = '/family/';
            return;
          }
        }
      })
      .catch(function () {
        // No profiles — continue with wizard (expected)
      });
  }

  // ─── Step navigation ──────────────────────────────────────────
  function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    currentStep = step;

    // Update progress bar
    var pct = (step / totalSteps) * 100;
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('step-indicator').textContent = 'Bước ' + step + '/' + totalSteps;

    // Show/hide steps
    var steps = document.querySelectorAll('.wizard-step');
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.remove('active');
      if (parseInt(steps[i].getAttribute('data-step')) === step) {
        steps[i].classList.add('active');
      }
    }

    // Special actions per step
    if (step === 5) {
      prepareCompletionStep();
    }
  }

  function collectData() {
    wizardData.elderName = document.getElementById('elder-name-input').value.trim() || 'Bà Nội';
    wizardData.elderAge = parseInt(document.getElementById('elder-age').value) || 90;

    var mobilityRadio = document.querySelector('input[name="mobility"]:checked');
    wizardData.mobility = mobilityRadio ? mobilityRadio.value : 'bedridden';

    var hearingRadio = document.querySelector('input[name="hearing"]:checked');
    wizardData.hearing = hearingRadio ? hearingRadio.value : 'hard_of_hearing';

    // Contacts
    wizardData.contacts = [];
    var entries = document.querySelectorAll('.contact-entry');
    for (var i = 0; i < entries.length; i++) {
      var name = entries[i].querySelector('.contact-name').value.trim();
      var phone = entries[i].querySelector('.contact-phone').value.trim();
      var priority = parseInt(entries[i].querySelector('.contact-priority').value) || (i + 1);
      if (name && phone) {
        wizardData.contacts.push({ name: name, phone: phone, priority: priority });
      }
    }

    wizardData.haUrl = document.getElementById('ha-url').value.trim();
    wizardData.haToken = document.getElementById('ha-token').value.trim();
    wizardData.room = document.getElementById('ha-room').value.trim() || 'grandma_room';
  }

  // ─── HA Connection Test ───────────────────────────────────────
  function testHaConnection() {
    var resultEl = document.getElementById('ha-test-result');
    var url = document.getElementById('ha-url').value.trim();
    var token = document.getElementById('ha-token').value.trim();

    if (!url) {
      resultEl.className = 'error';
      resultEl.textContent = '❌ Vui lòng nhập URL Home Assistant';
      resultEl.classList.remove('hidden');
      return;
    }

    resultEl.className = '';
    resultEl.textContent = '⏳ Đang kiểm tra...';
    resultEl.classList.remove('hidden');

    // Try to reach HA via fetch
    var apiUrl = url.replace(/\/$/, '') + '/api/';
    var headers = {};
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    fetch(apiUrl, { headers: headers, signal: AbortSignal.timeout(5000) })
      .then(function (res) {
        if (res.ok) {
          resultEl.className = 'success';
          resultEl.textContent = '✅ Kết nối thành công!';
        } else if (res.status === 401) {
          resultEl.className = 'error';
          resultEl.textContent = '❌ Token không hợp lệ. Kiểm tra lại Access Token.';
        } else {
          resultEl.className = 'error';
          resultEl.textContent = '⚠️ Kết nối được nhưng có lỗi (HTTP ' + res.status + ')';
        }
      })
      .catch(function () {
        resultEl.className = 'error';
        resultEl.textContent = '❌ Không kết nối được. Kiểm tra URL và đảm bảo HA đang chạy.';
      });
  }

  // ─── Add contact ──────────────────────────────────────────────
  function addContact() {
    var list = document.getElementById('contacts-list');
    var count = list.querySelectorAll('.contact-entry').length;
    if (count >= 5) return; // Max 5

    var entry = document.createElement('div');
    entry.className = 'contact-entry';
    entry.innerHTML =
      '<input type="text" class="contact-name" placeholder="Tên" />' +
      '<input type="text" class="contact-phone" placeholder="Zalo/Phone" />' +
      '<select class="contact-priority">' +
      '<option value="' + (count + 1) + '">Ưu tiên ' + (count + 1) + '</option>' +
      '</select>';
    list.appendChild(entry);
  }

  // ─── Prepare completion step ──────────────────────────────────
  function prepareCompletionStep() {
    collectData();
    var name = wizardData.elderName;
    document.getElementById('complete-desc').textContent =
      'Bờm Chăm đã sẵn sàng chăm sóc ' + name + '.';
    document.getElementById('complete-title').textContent = 'Tuyệt vời!';
  }

  // ─── Save to gateway ──────────────────────────────────────────
  function saveProfiles() {
    collectData();

    var elderId = wizardData.elderName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9_]/g, '');

    var room = wizardData.room;

    var profile = {
      elders: [{
        id: elderId,
        name: wizardData.elderName,
        age: wizardData.elderAge,
        room: room,
        mobility: wizardData.mobility,
        hearing: wizardData.hearing,
        ha_entities: {
          presence: 'binary_sensor.' + room + '_presence',
          motion: 'sensor.' + room + '_motion_minutes',
          temperature: 'sensor.' + room + '_temperature',
          humidity: 'sensor.' + room + '_humidity',
          media_player: 'media_player.' + room,
          light: 'light.' + room,
          sos_button: 'sensor.sos_button_action',
          camera: 'camera.' + room,
          fall_detection: 'binary_sensor.' + room + '_fall_detected',
          target_count: 'sensor.' + room + '_target_count'
        },
        tts: {
          volume: wizardData.hearing === 'deaf' ? 1.0 : wizardData.hearing === 'hard_of_hearing' ? 0.9 : 0.7,
          rate: 0.8,
          voice: 'vi-VN'
        },
        contacts: wizardData.contacts,
        active: true
      }],
      default_elder: elderId
    };

    // Save eldercare_profiles
    var saves = [
      request('memory.update', {
        key: 'eldercare_profiles',
        value: JSON.stringify(profile)
      }),
      request('memory.update', {
        key: 'eldercare_contacts',
        value: JSON.stringify(wizardData.contacts)
      }),
      request('memory.update', {
        key: 'eldercare_onboarding_complete',
        value: JSON.stringify({ completed_at: new Date().toISOString(), version: '1.0.0' })
      })
    ];

    Promise.all(saves)
      .then(function () {
        location.href = '/family/';
      })
      .catch(function () {
        // Still redirect even if save fails — data will be auto-migrated
        location.href = '/family/';
      });
  }

  // ─── Bind events ──────────────────────────────────────────────
  function init() {
    connect();

    // Next/prev buttons
    document.querySelectorAll('.wizard-next').forEach(function (btn) {
      btn.addEventListener('click', function () {
        collectData();
        goToStep(currentStep + 1);
      });
    });

    document.querySelectorAll('.wizard-prev').forEach(function (btn) {
      btn.addEventListener('click', function () {
        goToStep(currentStep - 1);
      });
    });

    // Add contact
    document.getElementById('add-contact-btn').addEventListener('click', addContact);

    // HA test
    document.getElementById('test-ha-btn').addEventListener('click', testHaConnection);

    // Start using (save + redirect)
    document.getElementById('btn-start-using').addEventListener('click', saveProfiles);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
