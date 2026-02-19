---
name: eldercare-multi-room
description: |
  Mở rộng giám sát từ 1 phòng thành nhiều phòng (phòng ngủ, WC,
  phòng khách, nhà bếp). Theo dõi bà di chuyển giữa các phòng.
  Use cases quan trọng:
  - Bà đi WC quá lâu → alert (nguy cơ ngã trong WC)
  - Bà rời phòng ngủ ban đêm quá lâu → alert
  - Track thói quen di chuyển hàng ngày
  Yêu cầu: thêm sensor presence cho mỗi phòng.
  Disabled by default — bật khi có thêm sensors.
metadata:
  {
    "openclaw":
      {
        "emoji": "🏠",
        "requires":
          {
            "extensions": ["home-assistant-mcp"],
          },
        "schedule":
          [
            {
              "kind": "cron",
              "expr": "*/5 * * * *",
              "tz": "Asia/Ho_Chi_Minh",
              "description": "Check multi-room presence mỗi 5 phút",
            },
          ],
      },
  }
---

# Eldercare Multi-Room — Giám sát nhiều phòng

Mở rộng giám sát từ 1 phòng ngủ thành nhiều phòng. Đặc biệt quan trọng cho an toàn WC — ngã trong nhà vệ sinh là tai nạn thường gặp nhất ở người cao tuổi.

## Phần cứng thêm (mỗi phòng)

| Phòng | Sensor gợi ý | Giá ước tính |
|-------|-------------|-------------|
| WC | Aqara FP2 (mmWave, chính xác nhất) | ~1,200,000d |
| Phòng khách | Aqara FP2 hoặc PIR motion sensor | ~200,000-1,200,000d |
| Nhà bếp | PIR motion sensor (đủ) | ~200,000d |

Aqara FP2 (mmWave) chính xác hơn — detect người đứng yên.
PIR motion sensor rẻ hơn — chỉ detect khi có chuyển động.

## Config nhiều phòng

Cấu hình trong memory `eldercare_multiroom_config` hoặc file `multiroom-config.json`:

```json
{
  "rooms": [
    {
      "id": "bedroom",
      "name_vi": "Phòng ngủ",
      "presence_entity": "binary_sensor.grandma_room_presence",
      "motion_entity": "sensor.grandma_room_motion_minutes",
      "is_primary": true,
      "max_absence_minutes": null
    },
    {
      "id": "bathroom",
      "name_vi": "Nhà vệ sinh",
      "presence_entity": "binary_sensor.bathroom_presence",
      "motion_entity": null,
      "is_primary": false,
      "max_absence_minutes": 20
    },
    {
      "id": "living_room",
      "name_vi": "Phòng khách",
      "presence_entity": "binary_sensor.living_room_presence",
      "motion_entity": null,
      "is_primary": false,
      "max_absence_minutes": 60
    },
    {
      "id": "kitchen",
      "name_vi": "Nhà bếp",
      "presence_entity": "binary_sensor.kitchen_motion",
      "motion_entity": null,
      "is_primary": false,
      "max_absence_minutes": 30
    }
  ]
}
```

## Cron handler (mỗi 5 phút)

### Bước 1: Check config

1. Read multiroom config → rooms[] list
2. Nếu chỉ có 1 room (bedroom) → hoạt động như monitor bình thường, skip multi-room logic
3. Nếu disabled → skip

### Bước 2: Query tất cả room sensors

Với mỗi room trong config:
```
action: get_state
entity_id: {presence_entity}
```
Ghi nhận: room X → presence ON/OFF.
Nếu entity unavailable → ghi note, bỏ qua room đó.

### Bước 3: Xác định bà ở phòng nào

**Logic xác định vị trí:**
1. Liệt kê phòng có presence ON
2. Nếu chỉ 1 phòng ON → bà ở đó
3. Nếu nhiều phòng ON → lấy phòng thay đổi gần nhất (query `last_changed` từ HA)
4. Nếu không phòng nào ON → "unknown" (có thể ngoài nhà hoặc sensor gap)

**Lưu vị trí hiện tại:**
Memory key `eldercare_location_current`:
```json
{
  "room": "bathroom",
  "since": "2026-02-20T14:30:00+07:00",
  "previous_room": "bedroom"
}
```

### Bước 4: Check alerts

**Alert 1: WC quá lâu (HIGH RISK)**

Bà ở WC > `max_absence_minutes` (mặc định 20 phút):

1. Phút 20: TTS nhắc nhẹ:
   ```
   TTS: "Bà ơi, bà ở nhà vệ sinh lâu rồi, bà có ổn không?"
   ```
2. Phút 25 (vẫn ở WC): Zalo gia đình:
   "⚠️ Bà ở WC hơn 25 phút. Kiểm tra bà!"
3. Phút 30 (vẫn ở WC): Escalate tương tự SOS Level 1:
   "🚨 Bà ở WC hơn 30 phút — có thể cần hỗ trợ NGAY!"

Lưu ý: Đây là HIGH RISK vì ngã trong WC rất nguy hiểm — sàn trơn, không gian hẹp, khó gọi giúp.

**Alert 2: Rời phòng ngủ ban đêm quá lâu**

Giữa 22h-6h, bà rời phòng ngủ > 15 phút:
- "⚠️ Bà rời phòng ngủ lúc {giờ}, chưa quay lại sau 15 phút"
- Bình thường đi WC đêm chỉ 5-10 phút

**Alert 3: Không xác định vị trí**

Tất cả rooms presence OFF > 30 phút:
- "⚠️ Không phát hiện bà ở bất kỳ phòng nào trong 30 phút"
- Có thể: sensor lỗi, bà ra ngoài (hiếm nếu nằm giường)

### Bước 5: Log di chuyển

Mỗi khi phát hiện bà chuyển phòng (room thay đổi so với lần check trước):

Memory key `eldercare_movement_{timestamp}`:
```json
{
  "from": "bedroom",
  "to": "bathroom",
  "time": "2026-02-20T02:30:00+07:00"
}
```

### Bước 6: Pattern analysis (tích lũy)

Tổng hợp movement log hàng ngày cho daily report:

```
Thời gian ở mỗi phòng:
  Phòng ngủ: 18h
  Phòng khách: 3h
  WC: 45 phút (6 lần)
  Nhà bếp: 0h

Số lần đi WC: 6 (bình thường 4-8 cho người già)
WC ban đêm: 2 lần (02:30, 04:15)
Lâu nhất ở WC: 12 phút (bình thường)
```

## Tích hợp với skills khác

- **eldercare-monitor**: Khi multi-room active, monitor biết bà ở phòng nào → context tốt hơn
- **eldercare-fall-detect**: Check fall pattern ở TẤT CẢ phòng (đặc biệt WC!)
- **eldercare-sleep-tracker**: Biết bà đi WC đêm mấy lần (cross-reference)
- **eldercare-daily-report**: Thêm section di chuyển

## Tích hợp daily report

```
🏠 Di chuyển:
  Phòng ngủ: 18h | Phòng khách: 3h | WC: 45 phút (6 lần)
  Đi WC đêm: 2 lần (2:30, 4:15)
  Bất thường: Không
```

## Graceful degradation

- **Chưa có sensor phòng khác** → skill chỉ monitor phòng ngủ (như eldercare-monitor hiện tại)
- **Thêm 1 sensor WC** → skill bật multi-room cho 2 phòng (bedroom + WC)
- **Thêm nữa** → thêm room vào config → skill tự mở rộng
- KHÔNG yêu cầu phải có tất cả sensors cùng lúc
- Disabled by default — gia đình bật khi sẵn sàng

## Chat triggers

- "bà ở đâu" / "bà ở phòng nào" → query eldercare_location_current
- "bà đi WC mấy lần hôm nay" → query movement logs
- "thêm phòng WC: binary_sensor.bathroom_presence" → add room to config

## Multi-Elder Support

Skill này hỗ trợ nhiều người thân:

1. Đọc `eldercare_profiles` từ memory
2. Nếu không tồn tại → auto-migrate default profile "ba_noi" (xem skill eldercare-profiles)
3. Loop qua tất cả active elders
4. Với mỗi elder:
   - Dùng `elder.ha_entities.*` thay vì hardcoded entity names
   - Dùng `eldercare_{elder.id}_*` làm memory key prefix
   - Dùng `elder.name` trong messages/TTS
   - Dùng `elder.contacts` cho alert recipients (fallback global contacts)
   - Dùng `elder.tts.*` cho TTS settings

### Thay đổi cụ thể

- `binary_sensor.grandma_room_presence` → `elder.ha_entities.presence`
- `sensor.grandma_room_motion_minutes` → `elder.ha_entities.motion`
- Additional room sensors (bathroom, kitchen, living_room) → read from `eldercare_{elder.id}_multiroom_config`
- Memory: `eldercare_multiroom_config` → `eldercare_{elder.id}_multiroom_config`
- Memory: `eldercare_location_current` → `eldercare_{elder.id}_location_current`
- Memory: `eldercare_movement_*` → `eldercare_{elder.id}_movement_*`
- TTS: Dùng `elder.tts.*` for bathroom timeout alerts
- Messages: "Bà ơi" → "{elder.name} ơi"
