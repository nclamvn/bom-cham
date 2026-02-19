---
name: eldercare-sleep-tracker
description: |
  Theo dõi giấc ngủ người cao tuổi từ cảm biến mmWave (không cần
  wearable). Phân tích: giờ ngủ, giờ thức, số lần thức giữa đêm,
  tổng thời gian ngủ. Kết quả gửi vào daily report mỗi sáng.
  Data source: HA sensor presence + motion history.
  Không yêu cầu phần cứng thêm.
metadata:
  {
    "openclaw":
      {
        "emoji": "😴",
        "requires":
          {
            "extensions": ["home-assistant-mcp"],
          },
        "schedule":
          [
            {
              "kind": "cron",
              "expr": "30 6 * * *",
              "tz": "Asia/Ho_Chi_Minh",
              "description": "Phân tích giấc ngủ đêm qua — chạy 6:30 sáng",
            },
          ],
      },
  }
---

# Eldercare Sleep Tracker — Theo dõi giấc ngủ

Skill phân tích giấc ngủ bà từ motion sensor data. Không cần thiết bị đeo — dùng FP2 mmWave presence + motion đã có sẵn.

## Nguyên lý

mmWave sensor (Aqara FP2) detect presence + motion liên tục.
Khi bà ngủ: presence=ON (vẫn trong phòng), motion=rất ít/không có.
Khi bà thức: motion tăng (trở mình, ngồi dậy, đi WC).

Skill phân tích motion history từ 22:00 → 06:30 để suy ra sleep pattern.

## Cron 6:30 sáng — Phân tích đêm qua

### Bước 1: Query HA history

Dùng tool `home_assistant` với action `get_history`:

```
action: get_history
entity_id: binary_sensor.grandma_room_presence
start_time: {22:00 hôm qua ISO}
end_time: {06:30 hôm nay ISO}
```

```
action: get_history
entity_id: sensor.grandma_room_motion_minutes
start_time: {22:00 hôm qua ISO}
end_time: {06:30 hôm nay ISO}
```

Nếu entity motion_minutes không available, fallback sang:
```
action: get_history
entity_id: binary_sensor.grandma_room_camera_motion
start_time: {22:00 hôm qua ISO}
end_time: {06:30 hôm nay ISO}
```

### Bước 2: Phân tích pattern

Từ motion history, xác định:

**Giờ ngủ (sleep_time):**
- Tìm thời điểm đầu tiên sau 21:00 mà motion dừng > 15 phút liên tục
- Cụ thể: `motion_minutes` tăng dần liên tục (bà không cử động) HOẶC `camera_motion` = off > 15 phút
- Ví dụ: motion cuối lúc 22:15 → sleep_time ≈ 22:15

**Giờ thức (wake_time):**
- Tìm thời điểm cuối cùng trong buổi sáng mà motion bắt đầu sustained > 5 phút
- Cụ thể: `motion_minutes` reset về 0 VÀ tiếp tục có activity
- Ví dụ: motion bắt đầu lúc 5:45 và tiếp tục → wake_time ≈ 5:45

**Số lần thức giữa đêm (wake_events):**
- Mỗi lần motion ON > 2 phút giữa sleep_time và wake_time
- Thường: đi WC, trở mình lâu, khó ngủ
- Format: `[{time: "02:30", duration_min: 8}, ...]`
- Lọc: motion < 2 phút = trở mình bình thường, KHÔNG count

**Tổng giờ ngủ (total_sleep_hours):**
- = (wake_time - sleep_time) - tổng thời gian wake_events
- Ví dụ: 22:15 → 5:45 = 7.5h - 15min thức = ~7.25h

**Chất lượng (quality):**
- **TỐT (good):** ≥7h ngủ, ≤1 lần thức, mỗi lần thức <10 phút
- **BÌNH THƯỜNG (normal):** 5-7h ngủ, ≤3 lần thức
- **KÉM (poor):** <5h ngủ, HOẶC >3 lần thức, HOẶC 1 lần thức >30 phút

### Bước 3: So sánh với 7 ngày trước

Query memory: tìm keys `eldercare_sleep_*` trong 7 ngày gần nhất.

Tính:
- Trung bình giờ ngủ 7 ngày (avg_7day)
- Trend: so sánh 3 ngày gần nhất
  - Giảm đều → "declining"
  - Tăng đều → "improving"
  - Dao động → "stable"

### Bước 4: Lưu memory

Key: `eldercare_sleep_{YYYY-MM-DD}`

```json
{
  "date": "2026-02-19",
  "sleep_time": "22:15",
  "wake_time": "05:45",
  "total_hours": 7.25,
  "wake_events": [
    { "time": "02:30", "duration_min": 8 }
  ],
  "quality": "good",
  "avg_7day": 6.8,
  "trend": "stable"
}
```

### Bước 5: Cảnh báo (nếu cần)

**Ngủ ít:**
- Ngủ < 4 giờ → Zalo gia đình: "⚠️ Bà chỉ ngủ ~{X} tiếng đêm qua. Thức {Y} lần."

**Thức giữa đêm lâu:**
- 1 lần thức > 30 phút → "⚠️ Bà thức lúc {giờ}, {X} phút. Có thể cần kiểm tra."

**Trend giảm:**
- 3 ngày liên tiếp giảm → "📊 Bà ngủ ít hơn 3 ngày liên tiếp ({X}h → {Y}h → {Z}h). Theo dõi thêm."

**KHÔNG cảnh báo** nếu chất lượng tốt hoặc bình thường.

## Tích hợp daily report

Skill `eldercare-daily-report` query key `eldercare_sleep_{today}`:

```
😴 Giấc ngủ:
  Ngủ lúc 22:15, thức lúc 5:45 (~7 tiếng)
  Thức 1 lần lúc 2:30 (8 phút)
  Chất lượng: Tốt ✅
  TB 7 ngày: 6.8 tiếng (→ ổn định)
```

## Xem lịch sử qua chat

Gia đình hỏi:
- "bà ngủ có ngon không" → report đêm qua
- "giấc ngủ bà tuần này" → bảng 7 ngày
- "bà thức mấy lần đêm qua" → chi tiết wake_events

## Giới hạn

- **Không chính xác 100%** — suy luận từ motion, không phải wearable sensor
- Nếu bà trở mình nhiều nhưng vẫn ngủ → có thể count sai wake_event
- Nếu ông ngủ cùng phòng → presence/motion có thể bị ảnh hưởng bởi ông
- Skill ghi rõ trong mọi report: "Ước tính dựa trên cảm biến phòng, tham khảo"
- Không phải chẩn đoán y khoa — nếu nghi ngờ vấn đề giấc ngủ → hỏi bác sĩ
