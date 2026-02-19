---
name: eldercare-medication
description: |
  Nhắc uống thuốc cho người cao tuổi. Gia đình cấu hình toa thuốc
  qua Zalo hoặc config UI. Hệ thống nhắc đúng giờ qua TTS + Zalo.
  Hỗ trợ nhiều thuốc, nhiều giờ, ghi nhận đã uống / chưa uống.
  Disabled by default — chỉ bật khi gia đình thêm toa thuốc.
homepage: https://github.com/nclamvn/bom-cham
metadata:
  {
    "openclaw":
      {
        "emoji": "💉",
        "schedule":
          [
            {
              "kind": "cron",
              "expr": "0 7,12,18,21 * * *",
              "tz": "Asia/Ho_Chi_Minh",
              "description": "Check nhắc thuốc 4 lần/ngày (7h, 12h, 18h, 21h)",
            },
          ],
      },
  }
---

# Eldercare Medication — Nhắc uống thuốc

Skill nhắc uống thuốc theo toa cho người cao tuổi. Disabled by default — chỉ hoạt động khi gia đình config toa thuốc.

## Config toa thuốc

Gia đình cấu hình qua chat hoặc lưu trực tiếp vào memory key `eldercare_medication_list`.

### Memory format (eldercare_medication_list):

```json
{
  "enabled": true,
  "medications": [
    {
      "name": "Thuốc huyết áp Amlodipine 5mg",
      "short_name": "huyết áp",
      "times": ["07:00", "21:00"],
      "with_food": true,
      "notes": "Uống sau ăn 30 phút"
    },
    {
      "name": "Vitamin D3",
      "short_name": "vitamin D",
      "times": ["07:00"],
      "with_food": false,
      "notes": ""
    },
    {
      "name": "Metformin 500mg",
      "short_name": "tiểu đường",
      "times": ["07:00", "18:00"],
      "with_food": true,
      "notes": "Uống ngay trước ăn"
    }
  ]
}
```

### Nhắn tin để config

Gia đình có thể nhắn chat:

- **Thêm thuốc:** "thêm thuốc: huyết áp lúc 7h và 21h" hoặc "thêm thuốc Amlodipine 5mg lúc 7h sáng 21h tối"
  - Parse: tên thuốc + giờ uống
  - Thêm vào `eldercare_medication_list.medications[]`
  - Reply: "✅ Đã thêm thuốc huyết áp: 7h, 21h"

- **Bỏ thuốc:** "bỏ thuốc huyết áp" hoặc "xóa thuốc vitamin D"
  - Tìm medication by short_name hoặc name (fuzzy match tiếng Việt)
  - Remove khỏi list
  - Reply: "✅ Đã bỏ thuốc huyết áp khỏi danh sách"

- **Danh sách:** "danh sách thuốc bà" hoặc "thuốc bà"
  - Reply: liệt kê tất cả thuốc + giờ

- **Tắt/bật:** "tắt nhắc thuốc" → `enabled = false`, "bật nhắc thuốc" → `enabled = true`

## Cron handler (7h, 12h, 18h, 21h)

Khi cron trigger:

### Bước 1: Check config

1. Read memory key `eldercare_medication_list`
2. Nếu không có hoặc `enabled === false` → skip, không làm gì
3. Nếu `medications` rỗng → skip

### Bước 2: Tìm thuốc cần nhắc

1. Lấy giờ hiện tại (timezone Asia/Ho_Chi_Minh)
2. Với mỗi medication trong list:
   a. Check `times[]`: giờ hiện tại khớp với time nào? (±30 phút window)
   b. Nếu không khớp → skip medication này

### Bước 3: Check đã uống chưa

Với mỗi thuốc cần nhắc:

1. Check memory key `eldercare_med_taken_{YYYYMMDD}_{short_name_normalized}`
   - Nếu key tồn tại → đã uống → skip
   - Nếu không → chưa uống → nhắc

### Bước 4: Nhắc thuốc

Nếu có thuốc CHƯA uống:

1. **TTS qua loa phòng bà** (dùng tool `home_assistant` với service `tts.speak` hoặc `media_player.play_media`):
   - "Bà ơi, đến giờ uống thuốc {short_name} nha!"
   - Nếu `with_food === true`: thêm "Bà uống sau khi ăn nha!"
   - TTS rate: 0.8 (chậm hơn bình thường cho bà dễ nghe)
   - Volume: max

2. **Gửi Zalo/Telegram group gia đình** (dùng messaging tool):
   - "💊 Nhắc: Bà cần uống thuốc {name} lúc {time}"
   - Kèm notes nếu có: "({notes})"

### Bước 5: Check thuốc quên

Nếu đây là cron buổi sau (ví dụ 12h) và thuốc buổi trước (7h) CHƯA uống:

1. Gửi Zalo/Telegram: "⚠️ Bà chưa uống thuốc {name} lúc {time}h sáng"
2. Chỉ cảnh báo 1 lần (check memory `eldercare_med_missed_{date}_{short_name}`)

## Ghi nhận đã uống

Gia đình hoặc bà xác nhận qua chat hoặc voice:

### Keywords xác nhận:

- "bà đã uống thuốc" / "đã uống" / "uống rồi"
- "bà uống thuốc huyết áp rồi" (chỉ định cụ thể)
- Voice: bà nói "uống rồi"

### Xử lý:

1. Nếu chỉ nói "uống rồi" (không chỉ thuốc): ghi nhận TẤT CẢ thuốc đến giờ hiện tại
2. Nếu chỉ thuốc cụ thể: chỉ ghi nhận thuốc đó

### Memory:

Lưu key `eldercare_med_taken_{YYYYMMDD}_{short_name_normalized}`:

```json
{
  "medication": "Thuốc huyết áp Amlodipine 5mg",
  "short_name": "huyết áp",
  "scheduled_time": "07:00",
  "taken_time": "07:15",
  "confirmed_by": "Con Lan (Zalo)",
  "confirmed_at": "2026-02-20T07:15:00+07:00"
}
```

Reply: "✅ Đã ghi nhận bà uống thuốc {short_name} lúc {time}"

## Tích hợp Daily Report

Skill `eldercare-daily-report` query medication status:

1. Read `eldercare_medication_list` → lấy danh sách thuốc
2. Với mỗi thuốc, check `eldercare_med_taken_{today}_{name}` → uống hay quên
3. Format:

```
💊 Thuốc:
  Huyết áp (Amlodipine): ✅ 7:15 + ✅ 21:00
  Vitamin D: ✅ 7:15
  Tiểu đường (Metformin): ✅ 7:15 + ⚠️ quên 18h
```

## Lưu ý quan trọng

- **Disabled by default**: Không phải bà nào cũng uống thuốc. Skill chỉ active khi `eldercare_medication_list` tồn tại và `enabled: true`
- **TTS volume max**: Bà nặng tai, cần TTS to và chậm
- **Nhắc nhẹ nhàng**: Giọng TTS tiếng Việt, tốc độ 0.8, tone ấm áp
- **Không spam**: Chỉ nhắc 1 lần mỗi thuốc mỗi giờ. Quên thuốc cảnh báo 1 lần.
- **Privacy**: Không lưu tên thuốc cụ thể trong logs/analytics, chỉ lưu short_name

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

- `media_player.grandma_room` → `elder.ha_entities.media_player`
- Memory: `eldercare_medication_list` → `eldercare_{elder.id}_medication_list`
- Memory: `eldercare_med_taken_{date}_{name}` → `eldercare_{elder.id}_med_taken_{date}_{name}`
- Memory: `eldercare_med_missed_{date}_{name}` → `eldercare_{elder.id}_med_missed_{date}_{name}`
- TTS: Dùng `elder.tts.rate` (0.8), `elder.tts.volume` cho reminders
- Messages: "Bà ơi, đến giờ uống thuốc" → "{elder.name} ơi, đến giờ uống thuốc"
