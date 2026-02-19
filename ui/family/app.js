// Bờm Chăm Family PWA — Vanilla JS App
// Connects to gateway via WebSocket (same protocol as Bom Control UI)

(function () {
  'use strict';

  // ─── Config ───────────────────────────────────────────────────
  var GW_HOST = location.hostname || '127.0.0.1';
  var GW_PORT = location.port || '18789';
  var WS_URL = 'ws://' + GW_HOST + ':' + GW_PORT;
  var POLL_INTERVAL = 30000; // 30 seconds
  var RECONNECT_DELAY = 3000;

  // ─── State ────────────────────────────────────────────────────
  var ws = null;
  var connected = false;
  var pendingRequests = {};
  var requestId = 0;
  var reconnectTimer = null;
  var pollTimer = null;
  var connectSent = false;

  var elders = [];
  var activeElderId = null;
  var elderData = {}; // { [elderId]: { temp, humidity, sleep, meds, status, events } }

  // ─── DOM refs ─────────────────────────────────────────────────
  var $ = function (id) { return document.getElementById(id); };

  // ─── WebSocket Connection ─────────────────────────────────────
  function connect() {
    if (ws) {
      try { ws.close(); } catch (e) { /* ignore */ }
    }
    ws = new WebSocket(WS_URL);
    updateConnectionStatus('connecting');

    ws.onopen = function () {
      connectSent = false;
      // Wait for challenge event, or send connect after timeout
      setTimeout(function () {
        if (!connectSent) sendConnect();
      }, 1500);
    };

    ws.onmessage = function (ev) {
      var data;
      try { data = JSON.parse(ev.data); } catch (e) { return; }

      if (data.type === 'event') {
        if (data.event === 'connect.challenge') {
          sendConnect();
        }
        return;
      }

      if (data.type === 'res') {
        var pending = pendingRequests[data.id];
        if (pending) {
          delete pendingRequests[data.id];
          if (data.ok) {
            pending.resolve(data.payload);
          } else {
            pending.reject(data.error || { message: 'request failed' });
          }
        }
        return;
      }
    };

    ws.onclose = function () {
      connected = false;
      updateConnectionStatus('disconnected');
      scheduleReconnect();
    };

    ws.onerror = function () {
      // close handler will fire
    };
  }

  function sendConnect() {
    if (connectSent) return;
    connectSent = true;

    request('connect', {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'family-pwa',
        version: '1.0.0',
        platform: navigator.platform || 'web',
        mode: 'webchat'
      },
      role: 'operator',
      scopes: ['operator.read'],
      caps: []
    }).then(function () {
      connected = true;
      updateConnectionStatus('connected');
      loadData();
      startPolling();
    }).catch(function () {
      updateConnectionStatus('disconnected');
    });
  }

  function request(method, params) {
    return new Promise(function (resolve, reject) {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('not connected'));
      }
      var id = 'family-' + (++requestId);
      pendingRequests[id] = { resolve: resolve, reject: reject };
      ws.send(JSON.stringify({ type: 'req', id: id, method: method, params: params }));

      // Timeout after 10s
      setTimeout(function () {
        if (pendingRequests[id]) {
          delete pendingRequests[id];
          reject(new Error('timeout'));
        }
      }, 10000);
    });
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY);
  }

  function updateConnectionStatus(status) {
    var dot = $('connection-status');
    if (!dot) return;
    dot.className = 'connection-dot ' + status;
    dot.title = status === 'connected' ? 'Đã kết nối' :
                status === 'connecting' ? 'Đang kết nối...' : 'Mất kết nối';
  }

  // ─── Data Loading ─────────────────────────────────────────────
  function loadData() {
    loadProfiles().then(function () {
      if (activeElderId) {
        loadElderData(activeElderId);
      }
    });
  }

  function loadProfiles() {
    return request('memory.search', { query: 'eldercare_profiles', limit: 1 })
      .then(function (result) {
        var items = (result && result.items) || (result && result.results) || [];
        if (items.length > 0) {
          var profiles = items[0].value || items[0];
          if (typeof profiles === 'string') {
            try { profiles = JSON.parse(profiles); } catch (e) { profiles = null; }
          }
          if (profiles && profiles.elders) {
            elders = profiles.elders.filter(function (e) { return e.active !== false; });
          }
        }

        // Default if no profiles
        if (elders.length === 0) {
          elders = [{
            id: 'ba_noi',
            name: 'Bà Nội',
            ha_entities: {
              temperature: 'sensor.grandma_room_temperature',
              humidity: 'sensor.grandma_room_humidity',
              presence: 'binary_sensor.grandma_room_presence',
              motion: 'sensor.grandma_room_motion_minutes',
              media_player: 'media_player.grandma_room'
            }
          }];
        }

        activeElderId = elders[0].id;
        renderElderSelector();
      })
      .catch(function () {
        // Fallback default
        elders = [{ id: 'ba_noi', name: 'Bà Nội', ha_entities: {} }];
        activeElderId = 'ba_noi';
        renderElderSelector();
      });
  }

  function loadElderData(elderId) {
    var elder = getElder(elderId);
    if (!elder) return;

    var data = elderData[elderId] || { temp: null, humidity: null, sleep: null, meds: null, status: 'unknown', events: [], health: [] };
    elderData[elderId] = data;

    // Load sensor data, sleep, meds, events in parallel
    var today = new Date().toISOString().slice(0, 10);
    var prefix = 'eldercare_' + elderId + '_';

    // Temperature & humidity via memory search (latest monitor check)
    request('memory.search', { query: prefix + 'check_', limit: 5 })
      .then(function (result) {
        var items = (result && result.items) || (result && result.results) || [];
        if (items.length > 0) {
          var latest = items[0].value || items[0];
          if (typeof latest === 'string') {
            try { latest = JSON.parse(latest); } catch (e) { latest = null; }
          }
          if (latest) {
            data.lastCheck = latest;
            if (latest.temperature) data.temp = latest.temperature;
            if (latest.humidity) data.humidity = latest.humidity;
            if (latest.level) data.status = latest.level;
          }
        }
        renderStatus(elderId);
      })
      .catch(function () {});

    // Sleep data
    request('memory.search', { query: prefix + 'sleep_' + today, limit: 1 })
      .then(function (result) {
        var items = (result && result.items) || (result && result.results) || [];
        if (items.length > 0) {
          var sleep = items[0].value || items[0];
          if (typeof sleep === 'string') {
            try { sleep = JSON.parse(sleep); } catch (e) { sleep = null; }
          }
          if (sleep && sleep.total_hours) {
            data.sleep = sleep.total_hours;
          }
        }
        renderStats(elderId);
      })
      .catch(function () {});

    // Medication status
    request('memory.search', { query: prefix + 'med_taken_' + today.replace(/-/g, ''), limit: 10 })
      .then(function (result) {
        var items = (result && result.items) || (result && result.results) || [];
        data.medsTaken = items.length;
        request('memory.search', { query: prefix + 'medication_list', limit: 1 })
          .then(function (result2) {
            var items2 = (result2 && result2.items) || (result2 && result2.results) || [];
            if (items2.length > 0) {
              var medList = items2[0].value || items2[0];
              if (typeof medList === 'string') {
                try { medList = JSON.parse(medList); } catch (e) { medList = null; }
              }
              if (medList && medList.medications) {
                data.medsTotal = medList.medications.length;
              }
            }
            renderStats(elderId);
          })
          .catch(function () {});
      })
      .catch(function () {});

    // Health data
    request('memory.search', { query: prefix + 'health_', limit: 10 })
      .then(function (result) {
        var items = (result && result.items) || (result && result.results) || [];
        data.health = items.map(function (item) {
          var v = item.value || item;
          if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
          return v;
        }).filter(Boolean);
        renderHealth(elderId);
      })
      .catch(function () {});

    // Timeline events — search recent monitor/exercise/visitor/etc
    var eventQueries = [
      prefix + 'check_',
      prefix + 'exercise_',
      prefix + 'visitor_',
      prefix + 'call_',
      prefix + 'med_taken_'
    ];

    var allEvents = [];
    var remaining = eventQueries.length;

    eventQueries.forEach(function (q) {
      request('memory.search', { query: q, limit: 5 })
        .then(function (result) {
          var items = (result && result.items) || (result && result.results) || [];
          items.forEach(function (item) {
            var v = item.value || item;
            if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
            if (v) {
              allEvents.push({ key: item.key || '', data: v });
            }
          });
        })
        .catch(function () {})
        .finally(function () {
          remaining--;
          if (remaining <= 0) {
            data.events = allEvents;
            renderTimeline(elderId);
          }
        });
    });

    renderElderName(elderId);
  }

  // ─── Rendering ────────────────────────────────────────────────
  function getElder(id) {
    for (var i = 0; i < elders.length; i++) {
      if (elders[i].id === id) return elders[i];
    }
    return null;
  }

  function renderElderSelector() {
    var sel = $('elder-selector');
    if (elders.length <= 1) {
      sel.classList.add('hidden');
      return;
    }
    sel.classList.remove('hidden');
    sel.innerHTML = '';
    elders.forEach(function (elder) {
      var tab = document.createElement('button');
      tab.className = 'elder-tab' + (elder.id === activeElderId ? ' active' : '');
      tab.textContent = elder.name || elder.id;
      tab.onclick = function () { switchElder(elder.id); };
      sel.appendChild(tab);
    });
  }

  function switchElder(id) {
    activeElderId = id;
    renderElderSelector();
    loadElderData(id);
  }

  function renderElderName(elderId) {
    var elder = getElder(elderId);
    if (elder && elderId === activeElderId) {
      $('elder-name').textContent = elder.name || elder.id;
    }
  }

  function renderStatus(elderId) {
    if (elderId !== activeElderId) return;
    var data = elderData[elderId] || {};
    var dot = $('status-dot');
    var text = $('status-text');
    var update = $('last-update');

    var level = data.status || 'unknown';
    dot.className = 'status-indicator' +
      (level === 'normal' ? ' ok' :
       level === 'attention' ? ' warn' :
       level === 'warning' || level === 'emergency' ? ' danger' : '');

    var messages = {
      normal: 'Ổn, có cử động gần đây',
      attention: 'Cần chú ý — bất động hơi lâu',
      warning: 'Cảnh báo — bất động lâu hoặc không có người',
      emergency: 'Khẩn cấp!',
      unknown: 'Đang cập nhật...'
    };
    text.textContent = messages[level] || messages.unknown;

    var now = new Date();
    update.textContent = 'Cập nhật: ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
  }

  function renderStats(elderId) {
    if (elderId !== activeElderId) return;
    var data = elderData[elderId] || {};

    $('temp').textContent = data.temp != null ? data.temp + '°C' : '--°C';
    $('humidity').textContent = data.humidity != null ? data.humidity + '%' : '--%';
    $('sleep').textContent = data.sleep != null ? data.sleep.toFixed(1) + 'h' : '--h';

    if (data.medsTotal != null) {
      $('meds').textContent = (data.medsTaken || 0) + '/' + data.medsTotal;
    }
  }

  function renderTimeline(elderId) {
    if (elderId !== activeElderId) return;
    var data = elderData[elderId] || {};
    var events = data.events || [];
    var container = $('timeline-list');

    if (events.length === 0) {
      container.innerHTML = '<div class="timeline-empty">Chưa có sự kiện hôm nay</div>';
      return;
    }

    // Sort by timestamp
    events.sort(function (a, b) {
      var ta = (a.data && a.data.timestamp) || a.key || '';
      var tb = (b.data && b.data.timestamp) || b.key || '';
      return tb.localeCompare(ta);
    });

    container.innerHTML = '';
    events.slice(0, 15).forEach(function (ev) {
      var item = document.createElement('div');
      item.className = 'timeline-item';

      var time = '';
      if (ev.data && ev.data.timestamp) {
        var d = new Date(ev.data.timestamp);
        time = pad(d.getHours()) + ':' + pad(d.getMinutes());
      } else {
        // Try to extract time from key
        var match = (ev.key || '').match(/(\d{2}):?(\d{2})/);
        if (match) time = match[1] + ':' + match[2];
      }

      var text = formatEvent(ev);

      item.innerHTML = '<span class="timeline-time">' + time + '</span>' +
                       '<span class="timeline-text">' + text + '</span>';
      container.appendChild(item);
    });
  }

  function formatEvent(ev) {
    var key = ev.key || '';
    var d = ev.data || {};

    if (key.indexOf('_check_') !== -1) {
      var level = d.level || d;
      if (typeof level === 'string') {
        var icons = { normal: '✅', attention: '⚠️', warning: '🔴', emergency: '🚨' };
        return (icons[level] || '📋') + ' Kiểm tra: ' + level;
      }
      return '📋 Kiểm tra phòng';
    }
    if (key.indexOf('_exercise_') !== -1) return '🏋️ Tập thể dục';
    if (key.indexOf('_visitor_') !== -1) return '👤 Có khách';
    if (key.indexOf('_call_') !== -1) return '📞 Cuộc gọi video';
    if (key.indexOf('_med_taken_') !== -1) return '💊 Đã uống thuốc' + (d.short_name ? ': ' + d.short_name : '');
    return '📝 ' + (typeof d === 'string' ? d : JSON.stringify(d).slice(0, 50));
  }

  function renderHealth(elderId) {
    if (elderId !== activeElderId) return;
    var data = elderData[elderId] || {};
    var health = data.health || [];
    var container = $('health-latest');

    if (health.length === 0) {
      container.innerHTML = '<p class="muted">Chưa có dữ liệu sức khoẻ</p>';
      return;
    }

    // Group by type, show latest of each
    var latest = {};
    health.forEach(function (h) {
      if (h && h.type && !latest[h.type]) {
        latest[h.type] = h;
      }
    });

    var typeLabels = {
      blood_pressure: 'Huyết áp',
      glucose: 'Đường huyết',
      heart_rate: 'Nhịp tim',
      weight: 'Cân nặng',
      temperature: 'Nhiệt độ',
      spo2: 'SpO2',
      note: 'Ghi chú'
    };

    container.innerHTML = '';
    Object.keys(latest).forEach(function (type) {
      var h = latest[type];
      var item = document.createElement('div');
      item.className = 'health-item';

      var value = '';
      if (h.values) {
        if (h.values.systolic) value = h.values.systolic + '/' + h.values.diastolic;
        else value = Object.values(h.values)[0];
      }
      if (h.text) value = h.text;
      if (h.unit) value += ' ' + h.unit;

      var statusClass = h.status === 'dangerous' ? 'dangerous' : h.status === 'high' || h.status === 'low' ? 'high' : 'normal';

      item.innerHTML = '<span class="health-label">' + (typeLabels[type] || type) + '</span>' +
                       '<span class="health-value ' + statusClass + '">' + (value || '--') + '</span>';
      container.appendChild(item);
    });
  }

  // ─── Actions ──────────────────────────────────────────────────
  function sendChatCommand(text) {
    return request('chat.send', { text: text }).catch(function () {
      // Fallback: try agent method
      return request('send', { text: text });
    });
  }

  function bindActions() {
    $('btn-call').onclick = function () {
      var elder = getElder(activeElderId);
      var name = elder ? elder.name : 'bà';
      sendChatCommand('gọi ' + name);
      showToast('Đang gọi ' + name + '...');
    };

    $('btn-music').onclick = function () {
      var elder = getElder(activeElderId);
      var name = elder ? elder.name : 'bà';
      sendChatCommand('mở nhạc cho ' + name);
      showToast('Đang mở nhạc...');
    };

    $('btn-message').onclick = function () {
      $('message-modal').classList.remove('hidden');
      $('message-text').focus();
    };

    $('btn-msg-cancel').onclick = function () {
      $('message-modal').classList.add('hidden');
      $('message-text').value = '';
    };

    $('btn-msg-send').onclick = function () {
      var text = $('message-text').value.trim();
      if (!text) return;
      var elder = getElder(activeElderId);
      var name = elder ? elder.name : 'bà';
      sendChatCommand('nhắn ' + name + ': ' + text);
      $('message-modal').classList.add('hidden');
      $('message-text').value = '';
      showToast('Đã gửi tin nhắn');
    };

    $('btn-camera').onclick = function () {
      var elder = getElder(activeElderId);
      var name = elder ? elder.name : 'bà';
      sendChatCommand('camera phòng ' + name);
      showToast('Đang chụp camera...');
    };

    // Health input
    $('btn-health-input').onclick = function () {
      $('health-modal').classList.remove('hidden');
    };

    $('btn-health-cancel').onclick = function () {
      $('health-modal').classList.add('hidden');
      $('health-value').value = '';
      $('health-type').value = '';
    };

    $('btn-health-save').onclick = function () {
      var type = $('health-type').value;
      var value = $('health-value').value.trim();
      if (!type || !value) return;

      var labels = {
        blood_pressure: 'huyết áp',
        glucose: 'đường huyết',
        heart_rate: 'nhịp tim',
        temperature: 'nhiệt độ',
        spo2: 'SpO2',
        weight: 'cân nặng',
        note: ''
      };

      var elder = getElder(activeElderId);
      var name = elder ? elder.name : 'bà';
      var msg = type === 'note'
        ? name + ' ' + value
        : labels[type] + ' ' + name + ' ' + value;

      sendChatCommand(msg);
      $('health-modal').classList.add('hidden');
      $('health-value').value = '';
      $('health-type').value = '';
      showToast('Đã ghi nhận');
    };
  }

  // ─── Toast ────────────────────────────────────────────────────
  function showToast(text) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = text;
    toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
      'background:#333;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;z-index:200;';
    document.body.appendChild(toast);
    setTimeout(function () { toast.remove(); }, 2500);
  }

  // ─── Polling ──────────────────────────────────────────────────
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(function () {
      if (connected && activeElderId) {
        loadElderData(activeElderId);
      }
    }, POLL_INTERVAL);
  }

  // ─── Helpers ──────────────────────────────────────────────────
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // ─── Service Worker ───────────────────────────────────────────
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  // ─── Init ─────────────────────────────────────────────────────
  function init() {
    registerSW();
    bindActions();
    connect();
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
