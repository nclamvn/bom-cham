---
name: eldercare-profiles
description: |
  Quản lý hồ sơ người thân cao tuổi. Hỗ trợ chăm sóc nhiều người
  cùng lúc (bà nội, ông nội, bố mẹ già...). Mỗi người có profile
  riêng với sensors, contacts, config riêng.

  Gia đình quản lý qua chat:
  - "thêm ông nội" → tạo profile mới
  - "danh sách người thân" → list all elders
  - "xoá profile ông nội" → deactivate (không xoá data)

  Auto-migration: Nếu chưa có profiles → tự tạo "Bà Nội"
  từ config hiện tại. Không cần gia đình làm gì.
metadata:
  openclaw:
    emoji: "👨‍👩‍👧‍👦"
---

# Eldercare Profiles — Quản lý người thân

## Auto-migration (lần đầu)

Khi bất kỳ eldercare skill chạy, TRƯỚC TIÊN check memory `eldercare_profiles`:

1. Nếu KHÔNG tồn tại → AUTO-MIGRATE:
   ```
   Đọc eldercare_contacts, eldercare_devices_config →
   Tạo eldercare_profiles với 1 elder "ba_noi" →
   Map entities hiện tại (grandma_room_*) vào profile →
   Lưu memory eldercare_profiles
   ```
2. Nếu TỒN TẠI → đọc profiles, tiếp tục

### Auto-migrate default profile

Khi tạo default profile, dùng thông tin từ `profiles-config.json`:

```json
{
  "id": "ba_noi",
  "name": "Bà Nội",
  "age": 90,
  "room": "grandma_room",
  "mobility": "bedridden",
  "hearing": "hard_of_hearing",
  "ha_entities": {
    "presence": "binary_sensor.grandma_room_presence",
    "motion": "sensor.grandma_room_motion_minutes",
    "temperature": "sensor.grandma_room_temperature",
    "humidity": "sensor.grandma_room_humidity",
    "media_player": "media_player.grandma_room",
    "light": "light.grandma_room",
    "sos_button": "sensor.sos_button_action",
    "camera": "camera.grandma_room",
    "fall_detection": "binary_sensor.grandma_room_fall_detected",
    "target_count": "sensor.grandma_room_target_count"
  },
  "tts": {
    "volume": 0.9,
    "rate": 0.8,
    "voice": "vi-VN"
  },
  "active": true
}
```

Contacts: Copy từ memory `eldercare_contacts` (nếu có) vào `elder.contacts`.

## Thêm người thân mới

Gia đình nhắn: "thêm ông nội" hoặc "add ong noi"

Flow:
1. Parse tên → id (slug): "ông nội" → "ong_noi"
2. Hỏi thông tin cơ bản:
   - "Ông bao nhiêu tuổi?"
   - "Ông ở phòng nào?" (để map HA entities)
   - "Ông đi lại được không?" (bedridden/wheelchair/walking)
3. Tạo profile mới trong eldercare_profiles.elders[]
4. Map HA entities dựa trên tên phòng:
   - Room "ong_noi_room" → binary_sensor.ong_noi_room_presence, sensor.ong_noi_room_temperature, v.v.
   - Nếu entities chưa tồn tại trong HA → ghi note, skill vẫn tạo profile
5. Reply: "✅ Đã thêm Ông Nội. Hệ thống sẽ bắt đầu giám sát khi có sensor."

## Sửa profile

Gia đình nhắn: "sửa profile bà nội" hoặc "thay đổi thông tin ông nội"

Flow:
1. Tìm elder by name/id
2. Hiển thị thông tin hiện tại
3. Hỏi muốn sửa gì → cập nhật field tương ứng
4. Lưu lại vào memory `eldercare_profiles`

## Xoá / Deactivate profile

Gia đình nhắn: "xoá profile ông nội" hoặc "tắt giám sát ông nội"

Flow:
1. Tìm elder by name/id
2. Set `active: false` (KHÔNG xoá data — dữ liệu vẫn giữ)
3. Reply: "✅ Đã tắt giám sát Ông Nội. Dữ liệu vẫn được giữ lại."

## Danh sách người thân

Gia đình nhắn: "danh sách người thân" hoặc "list elders"

Reply format:
```
👨‍👩‍👧‍👦 Danh sách người thân:

1. 👵 Bà Nội (90 tuổi) — Phòng ngủ chính ✅ Đang giám sát
   Sensors: 5/5 online | Contacts: 2 người

2. 👴 Ông Nội (88 tuổi) — Phòng khách ✅ Đang giám sát
   Sensors: 3/5 online | Contacts: 2 người

3. 👨 Ba (65 tuổi) — Tầng 2 ⏸️ Tạm tắt
```

## Cách skills khác đọc profiles

TẤT CẢ eldercare skills PHẢI thay đổi logic:

```
TRƯỚC:
  1. Đọc entity grandma_room_presence → check alert

SAU:
  1. Đọc eldercare_profiles → lấy list active elders
  2. NẾU không có profiles → auto-migrate (tạo default)
  3. VỚI MỖI active elder:
     a. Lấy HA entities từ profile (elder.ha_entities.presence)
     b. Đọc entity → check alert
     c. Dùng elder.id làm prefix cho memory keys
     d. Dùng elder.contacts cho alert recipients
     e. Dùng elder.tts cho TTS settings
  4. Alert message bao gồm tên elder: "⚠️ Bà Nội: bất động > 30 phút"
```

### Memory key convention

```
TRƯỚC (hardcoded, 1 elder):
  eldercare_monitor_{timestamp}
  eldercare_health_blood_pressure_{timestamp}
  eldercare_sleep_{date}
  eldercare_queue_{timestamp}

SAU (namespaced by elder_id):
  eldercare_{elder_id}_monitor_{timestamp}
  eldercare_{elder_id}_health_blood_pressure_{timestamp}
  eldercare_{elder_id}_sleep_{date}
  eldercare_{elder_id}_queue_{timestamp}

VÍ DỤ:
  eldercare_ba_noi_monitor_2026-02-20T10:00:00
  eldercare_ong_noi_health_blood_pressure_2026-02-20T08:30:00
```

## Profile fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Slug: "ba_noi", "ong_noi" |
| name | string | Yes | Display: "Bà Nội", "Ông Nội" |
| age | number | No | Tuổi |
| room | string | Yes | Room name prefix cho HA entities |
| mobility | enum | No | bedridden / wheelchair / walking_with_aid / independent |
| hearing | enum | No | normal / hard_of_hearing / deaf |
| conditions | string[] | No | Bệnh nền |
| ha_entities | object | Yes | Map HA entity IDs |
| tts | object | No | Volume, rate, voice |
| contacts | array | No | Per-elder contacts (override global) |
| medication | object | No | Per-elder medication config |
| exercise_level | number | No | 1/2/3 |
| active | boolean | Yes | true = đang giám sát |

## Backward compatibility

**QUY TẮC QUAN TRỌNG NHẤT:**

Nếu `eldercare_profiles` KHÔNG TỒN TẠI trong memory:
  → Tạo AUTO-MIGRATE profile mặc định:
    - id: "ba_noi"
    - Dùng tất cả entity names hiện tại (grandma_room_*)
    - Dùng contacts/config hiện tại
  → Tất cả skills hoạt động Y HỆT cũ
  → Gia đình KHÔNG cần làm gì

Nếu `eldercare_profiles` TỒN TẠI:
  → Đọc profiles, loop qua active elders
  → Mỗi elder dùng HA entities từ profile
  → Memory keys prefix bằng elder_id
