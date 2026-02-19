---
name: eldercare-visitor-log
description: |
  Ghi nhận khách đến thăm bà từ cảm biến presence.
  Aqara FP2 có target_count — phát hiện nhiều người trong phòng.
  Khi có khách → log thời gian, gửi Zalo gia đình.
  Security: phát hiện người lạ ban đêm → alert cao.
  Hữu ích: gia đình biết ai đến thăm bà khi không có mặt.
metadata:
  {
    "openclaw":
      {
        "emoji": "🚪",
        "requires":
          {
            "extensions": ["home-assistant-mcp"],
          },
        "schedule":
          [
            {
              "kind": "cron",
              "expr": "*/10 * * * *",
              "tz": "Asia/Ho_Chi_Minh",
              "description": "Check target count mỗi 10 phút",
            },
          ],
      },
  }
---

# Eldercare Visitor Log — Ghi nhận khách thăm

Skill phát hiện và log khách đến thăm bà dựa trên sensor presence count. Cũng hoạt động như lớp security nhẹ.

## Nguyên lý

Aqara FP2 mmWave sensor có thể detect số người trong phòng thông qua entity `sensor.grandma_room_target_count` (hoặc attribute target_count).

- Bình thường: target_count = 0 (bà nằm yên) hoặc 1 (bà + motion nhẹ)
- Khi có khách: target_count >= 2 (hoặc > resident_count nếu ông ở cùng)

## Cron handler (mỗi 10 phút)

### Bước 1: Query HA

```
action: get_state
entity_id: sensor.grandma_room_target_count
```

Nếu entity KHÔNG tồn tại hoặc unavailable:
- Ghi note vào log: "target_count entity not available"
- Skill inactive — skip tất cả logic
- KHÔNG báo lỗi, chỉ ghi note

### Bước 2: So sánh với resident_count

Config: `resident_count: 1` (mặc định bà ở 1 mình)

- Nếu target_count <= resident_count → không có khách → Bước 3a
- Nếu target_count > resident_count → có khách → Bước 3b

### Bước 3a: Không có khách

Check memory `eldercare_visitor_active`:
- Nếu KHÔNG có → bình thường, skip
- Nếu CÓ → khách đã về:
  1. Tính duration: now - start_time
  2. Lưu memory `eldercare_visitor_{date}_{HHmm}`:
     ```json
     {
       "start": "2026-02-20T14:00:00+07:00",
       "end": "2026-02-20T14:45:00+07:00",
       "duration_min": 45,
       "max_count": 2
     }
     ```
  3. Xóa memory `eldercare_visitor_active`
  4. Gửi Zalo (nếu alert_on_departure): "🚪 Khách đã về (ở {X} phút)"

### Bước 3b: Có khách

Check memory `eldercare_visitor_active`:
- Nếu CÓ → visit đang diễn ra, update max_count nếu cần
- Nếu KHÔNG CÓ → visit MỚI:
  1. Lưu memory `eldercare_visitor_active`:
     ```json
     {
       "start": "2026-02-20T14:00:00+07:00",
       "count": 2,
       "max_count": 2
     }
     ```
  2. Check expected visits (xem bên dưới)
  3. Check unusual hours (xem bên dưới)
  4. Gửi Zalo (nếu alert_on_arrival):
     "🚪 Có khách ở phòng bà (phát hiện {count} người lúc {giờ})"

### Bước 4: Security — Unusual hours

Nếu detect visitor trong khung giờ bất thường (default 23h-5h):

1. Check expected visits → nếu có → skip alert
2. Gửi Zalo HIGH priority:
   "⚠️ Phát hiện {count} người trong phòng bà lúc {giờ} — kiểm tra ngay!"
3. Lưu memory `eldercare_visitor_security_{date}_{time}`

## Kết hợp ông nội

Nếu ông ở cùng bà → set `resident_count: 2` trong config.
Threshold thay đổi: target_count > 2 → có khách.

## Gia đình báo trước

Gia đình chat:
- "hôm nay có khách đến thăm bà" → lưu `eldercare_visitor_expected_{date}`
- "bác sĩ đến khám bà 14h" → lưu `eldercare_visitor_expected_{date}: { time: "14:00", who: "bác sĩ" }`

Khi có expected visit → vẫn log nhưng KHÔNG gửi alert. Reply khi khách đến:
"🚪 Khách đến (đã được báo trước)"

## Debounce

- Không alert lại nếu visit đang diễn ra (eldercare_visitor_active tồn tại)
- `debounce_minutes: 5` — target_count phải > resident_count liên tục 5 phút mới count (tránh false positive khi ai đi ngang qua)

## Tích hợp daily report

```
🚪 Khách thăm: 1 lượt (14:00-14:45, 45 phút)
```
hoặc
```
🚪 Khách thăm: 2 lượt — 10:30 (15 phút), 14:00 (45 phút)
```
hoặc
```
🚪 Khách thăm: Không có hôm nay
```

## Graceful degradation

- Nếu FP2 không có target_count (firmware cũ) → skill inactive, không lỗi
- Nếu chỉ có binary presence (on/off) → không thể phân biệt 1 vs nhiều người → skill inactive
- Skill ghi rõ: cần FP2 với firmware hỗ trợ multi-target tracking
