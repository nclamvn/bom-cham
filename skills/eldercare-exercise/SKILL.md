---
name: eldercare-exercise
description: |
  Hướng dẫn bài tập nhẹ cho người cao tuổi nằm giường hoặc ngồi.
  TTS đọc từng bước chậm rãi, đếm giữ, nghỉ giữa các bài.
  Trigger: Gia đình nhắn "tập thể dục cho bà" hoặc cron hàng ngày.
  Tất cả bài tập AN TOÀN cho người 90+ nằm giường.
  Disabled by default — gia đình bật khi sẵn sàng.
metadata:
  {
    "openclaw":
      {
        "emoji": "🏋️",
        "requires":
          {
            "extensions": ["home-assistant-mcp"],
          },
        "schedule":
          [
            {
              "kind": "cron",
              "expr": "0 9 * * *",
              "tz": "Asia/Ho_Chi_Minh",
              "description": "Nhắc tập thể dục 9h sáng (nếu enabled)",
            },
          ],
      },
  }
---

# Eldercare Exercise — Bài tập cho người nằm giường

## Disclaimer

**QUAN TRỌNG:** Bài tập này được thiết kế cho người cao tuổi khi nằm giường hoặc ngồi. Tuy nhiên, MỌI chương trình tập luyện nên được bác sĩ duyệt trước khi bắt đầu. Nếu bà đau hoặc khó chịu khi tập → DỪNG NGAY và thông báo gia đình.

## Chương trình tập (3 levels)

### Level 1: Siêu nhẹ (Người nằm liệt giường) — MẶC ĐỊNH

| # | Bài tập | Mô tả TTS | Thời gian |
|---|---------|-----------|-----------|
| 1 | Thở sâu | "Bà hít vào từ từ... giữ... thở ra chậm..." | 5 lần x 10s |
| 2 | Xoay cổ tay | "Bà xoay cổ tay phải tròn tròn nha... đổi bên..." | 10 vòng x 2 tay |
| 3 | Co duỗi ngón tay | "Bà nắm tay lại... mở ra... nắm lại..." | 10 lần x 2 tay |
| 4 | Nâng tay | "Bà nâng tay phải lên từ từ... hạ xuống..." | 5 lần x 2 tay |
| 5 | Co duỗi chân | "Bà co đầu gối phải lên... duỗi ra..." | 5 lần x 2 chân |
| 6 | Xoay cổ chân | "Bà xoay cổ chân phải tròn tròn..." | 10 vòng x 2 chân |
| 7 | Thở sâu kết thúc | "Bà hít thở sâu... giỏi lắm, bà tập xong rồi!" | 3 lần |

**Tổng: ~10 phút**

### Level 2: Nhẹ (Người ngồi được)

Bài 1-7 của Level 1, cộng thêm:

| # | Bài tập | Mô tả TTS | Thời gian |
|---|---------|-----------|-----------|
| 8 | Xoay vai | "Bà xoay vai phải lên, ra sau, xuống... đổi bên..." | 10 vòng x 2 vai |
| 9 | Nghiêng người | "Bà nghiêng người qua phải từ từ... thẳng lại... qua trái..." | 5 lần mỗi bên |
| 10 | Nâng chân ngồi | "Bà nâng chân phải lên khỏi ghế từ từ... hạ xuống..." | 5 lần x 2 chân |

**Tổng: ~15 phút**

### Level 3: Trung bình (Người đứng được với hỗ trợ)

Bài 1-10 của Level 2, cộng thêm:

| # | Bài tập | Mô tả TTS | Thời gian |
|---|---------|-----------|-----------|
| 11 | Đứng vịn ghế | "Bà vịn ghế đứng dậy từ từ... giữ 10 giây... ngồi xuống..." | 3 lần |
| 12 | Bước tại chỗ | "Bà bước chân tại chỗ nha... trái... phải... trái..." | 20 bước |
| 13 | Kiễng chân | "Bà kiễng gót chân lên... hạ xuống..." | 5 lần |

**Tổng: ~20 phút**

## TTS Execution Flow

Khi trigger (chat hoặc cron 9h):

### Pre-checks

1. Check `eldercare_exercise_config` trong memory → enabled?
   - Nếu disabled → skip (cron), hoặc reply "Tính năng tập thể dục chưa bật. Nhắn 'bật tập thể dục' để bắt đầu." (chat)

2. Check bà thức:
   ```
   action: get_state
   entity_id: sensor.grandma_room_motion_minutes
   ```
   - Nếu motion_minutes > 30 → bà có thể đang ngủ → skip
   - Reply/retry: "Bà đang nghỉ, để lúc khác nha"
   - Nếu cron → lưu memory `eldercare_exercise_retry_{date}` → retry 10h

3. Check không trùng event:
   - Memory `eldercare_sos_active` tồn tại? → skip
   - Memory `eldercare_call_active` tồn tại? → skip

### TTS Flow

4. Bắt đầu:
   ```
   TTS: "Bà ơi, mình tập thể dục nhẹ nha! Bà sẵn sàng chưa?"
   ```
   Dùng tool `home_assistant`:
   ```
   action: call_service
   domain: tts
   service: speak
   target: { entity_id: media_player.grandma_room }
   data: { message: "Bà ơi, mình tập thể dục nhẹ nha!", language: "vi" }
   ```
   Chờ 5 giây.

5. Với mỗi bài tập trong Level hiện tại:
   ```
   TTS: "Bài {số}: {tên bài}"
   [Chờ 2 giây]
   TTS: "{Mô tả động tác chi tiết}"
   [Đếm TTS: "Một... hai... ba..." — pace 1 số / 3 giây]
   TTS: "Nghỉ một chút nha bà..."
   [Chờ 10 giây]
   ```

6. Kết thúc:
   ```
   TTS: "Bà tập xong rồi! Giỏi quá! Bà uống miếng nước nha!"
   ```

7. Lưu memory:
   Key: `eldercare_exercise_{YYYY-MM-DD}`
   ```json
   {
     "date": "2026-02-20",
     "level": 1,
     "started_at": "09:15",
     "duration_min": 10,
     "completed": true
   }
   ```

8. Gửi Zalo group:
   "🏋️ Bà đã tập thể dục sáng nay (10 phút, Level 1)"

### TTS Settings

- **Volume:** MAX — bà nặng tai
  ```
  action: call_service
  domain: media_player
  service: volume_set
  target: { entity_id: media_player.grandma_room }
  data: { volume_level: 1.0 }
  ```
- **Rate:** 0.7 (chậm hơn bình thường — bà cần thời gian hiểu và làm theo)
- **Pause giữa câu:** 2-3 giây
- **Pause giữa bài:** 10 giây
- **Đếm pace:** 1 số / 3 giây

## Cron 9h sáng

1. Check config enabled → skip nếu disabled
2. Check bà thức → skip nếu ngủ, retry 10h
3. Check không trùng SOS/video call
4. Bắt đầu TTS exercise flow
5. Nếu đã tập hôm nay (key tồn tại) → skip

## Chat triggers

- **Tập ngay:** "tập thể dục cho bà", "bà tập", "exercise" → start flow
- **Tắt:** "tắt tập thể dục" → set enabled=false, reply "✅ Đã tắt nhắc tập thể dục"
- **Bật:** "bật tập thể dục" → set enabled=true, reply "✅ Đã bật nhắc tập thể dục mỗi sáng 9h"
- **Đổi level:** "đổi level 2", "tập level 3" → update level, reply "✅ Đổi sang Level {X}"
- **Xem status:** "bà tập chưa", "exercise status" → check eldercare_exercise_{today}

## Tích hợp daily report

```
🏋️ Thể dục: Tập lúc 9:15 (Level 1, 10 phút) ✅
```
hoặc
```
🏋️ Thể dục: Chưa tập hôm nay
```
