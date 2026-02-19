---
name: eldercare-daily-report
description: |
  Báo cáo tình trạng bà mỗi ngày lúc 21:00. Tổng hợp dữ liệu từ
  tất cả eldercare skills: hoạt động, cuộc gọi, cảnh báo, môi trường phòng.
  Viết tự nhiên bằng tiếng Việt, gửi Zalo group gia đình.
  Data sources: eldercare-monitor, eldercare-sos, eldercare-videocall,
  eldercare-companion, eldercare-sleep-tracker, eldercare-exercise,
  eldercare-weather-alert, eldercare-visitor-log, eldercare-multi-room,
  eldercare-health-log, eldercare-medication, Home Assistant sensors.
metadata:
  {
    "openclaw":
      {
        "emoji": "📊",
        "schedule":
          [
            {
              "kind": "cron",
              "expr": "0 21 * * *",
              "tz": "Asia/Ho_Chi_Minh",
              "description": "Báo cáo ngày lúc 21h",
            },
          ],
      },
  }
---

# Eldercare Daily Report — Báo cáo ngày

Skill này chạy lúc 21:00 mỗi ngày, tổng hợp toàn bộ dữ liệu eldercare
từ ngày hôm nay, viết thành báo cáo tiếng Việt tự nhiên, gửi Zalo group gia đình.

## Khi trigger (21:00 mỗi ngày)

### Bước 1: Thu thập dữ liệu từ memory

Tìm trong memory tất cả entries có prefix `eldercare_` với timestamp NGÀY HÔM NAY.

**1a. Monitoring data** (từ skill eldercare-monitor):
- Tìm keys: `eldercare_check_*`
- Tổng hợp: tổng số lần check, số lần mỗi mức (normal/attention/warning/emergency)
- Mức cao nhất trong ngày

**1b. SOS events** (từ skill eldercare-sos):
- Tìm keys: `eldercare_sos_active`, `eldercare_sos_*`
- Có SOS nào hôm nay? Bao nhiêu lần?
- Chi tiết: nguồn trigger, mức escalation cao nhất, ai xử lý, thời gian phản hồi

**1c. Video calls** (từ skill eldercare-videocall):
- Tìm keys: `eldercare_call_*`
- Bao nhiêu cuộc gọi, ai gọi, mấy giờ
- Tổng thời gian ước tính

**1d. Companion activity** (từ skill eldercare-companion):
- `eldercare_music_played_*` → bà nghe nhạc mấy lần, playlist nào
- `eldercare_story_bookmark` → bà nghe truyện không, đến đâu
- `eldercare_reminder_*` → nhắc nhở gì, bao nhiêu lần
- `eldercare_voice_command_*` → bà dùng voice command gì

**1e. Sleep data** (từ skill eldercare-sleep-tracker):
- Tìm keys: `eldercare_sleep_{date}`
- Giờ ngủ, giờ thức, tổng giờ ngủ, số lần thức giấc, chất lượng (good/normal/poor)
- So sánh vs trung bình 7 ngày

**1f. Exercise data** (từ skill eldercare-exercise):
- Tìm keys: `eldercare_exercise_{date}`
- Bà có tập hôm nay không? Tập mấy bài, hoàn thành bao nhiêu %
- Skipped lý do (nếu có)

**1g. Weather alerts** (từ skill eldercare-weather-alert):
- Tìm keys: `eldercare_weather_{date}_*`
- Cảnh báo thời tiết nào hôm nay? Nhiệt độ ngoài trời vs trong phòng
- Bất thường: quá nóng, quá lạnh, bão

**1h. Visitor log** (từ skill eldercare-visitor-log):
- Tìm keys: `eldercare_visitor_{date}_*`
- Bao nhiêu lượt khách, thời gian mỗi lượt
- Khách ban đêm (security event) nếu có

**1i. Multi-room movement** (từ skill eldercare-multi-room):
- Tìm keys: `eldercare_movement_{date}_*`, `eldercare_location_current`
- Thời gian ở mỗi phòng, số lần đi WC, WC ban đêm
- Bất thường: WC quá lâu, rời phòng ngủ đêm

**1j. Health log** (từ skill eldercare-health-log):
- Tìm keys: `eldercare_health_{date}_*`
- Số đo sức khỏe hôm nay: huyết áp, đường huyết, nhịp tim, etc.
- Status bất thường nào không

**1k. Medication** (từ skill eldercare-medication):
- Tìm keys: `eldercare_med_taken_{date}_*`, `eldercare_med_missed_{date}_*`
- Uống thuốc đúng giờ? Bỏ lỡ liều nào?

### Bước 2: Thu thập sensor history từ Home Assistant

Dùng tool `home_assistant` với action `get_history`:

**Nhiệt độ phòng:**
```
action: get_history
entity_id: sensor.grandma_room_temperature
start_time: {00:00 hôm nay ISO}
end_time: {21:00 hôm nay ISO}
```
Tính: min, max, trung bình

**Độ ẩm:**
```
action: get_history
entity_id: sensor.grandma_room_humidity
start_time: {00:00 hôm nay ISO}
end_time: {21:00 hôm nay ISO}
```
Tính: trung bình

**Motion pattern** (ước tính giờ thức/ngủ):
```
action: get_history
entity_id: sensor.grandma_room_motion_minutes
start_time: {00:00 hôm nay ISO}
```
- Giờ thức ước tính: thời điểm đầu tiên motion reset về 0 sau 6h sáng
- Giờ ngủ trưa: khoảng thời gian motion > 30 phút liên tục trong 13h-15h
- Hoạt động chung: bao nhiêu % thời gian có motion trong giờ thức

### Bước 3: Viết report tiếng Việt

Dùng dữ liệu thu thập, viết báo cáo tiếng Việt TỰ NHIÊN.
KHÔNG dùng bảng hay JSON. Viết như người thật nhắn tin báo cáo cho gia đình.

**Template (điều chỉnh tùy data):**

```
📊 BÁO CÁO NGÀY {ngày/tháng/năm}

🛏️ Sinh hoạt:
Bà thức khoảng {giờ thức ước tính}h sáng. {Có/Không} ngủ trưa
{từ giờ đến giờ nếu có}. Nhìn chung bà {mô tả hoạt động}.

📞 Kết nối gia đình:
{X} cuộc gọi hôm nay: {liệt kê ai gọi, mấy giờ}.
{Hoặc nếu không có: "Chưa ai gọi bà hôm nay 😢"}

⚠️ Cảnh báo:
{Nếu có: liệt kê cảnh báo + mức + kết quả xử lý}
{Nếu không có: "Không có cảnh báo bất thường ✅"}

🎵 Giải trí:
{Bà nghe nhạc X lần (playlist Y). Nghe truyện đến chương Z.}
{Voice commands bà dùng: liệt kê}
{Hoặc: "Bà không yêu cầu giải trí hôm nay"}

😴 Giấc ngủ:
{Bà ngủ từ {giờ ngủ} đến {giờ thức}, tổng {X}h. Chất lượng: {good/normal/poor}.}
{Thức giấc {X} lần. Đi WC đêm: {X} lần (nếu có multi-room data).}
{So sánh: hơn/kém trung bình tuần.}

💊 Sức khỏe:
{Thuốc: uống đủ {X}/{Y} liều ✅ hoặc bỏ lỡ liều {giờ} ⚠️}
{Số đo: huyết áp {X}/{Y}, đường huyết {X}, nhịp tim {X} — bình thường/bất thường}
{Hoặc: "Không có số đo sức khỏe hôm nay"}

🏋️ Vận động:
{Bà tập thể dục lúc {giờ}, hoàn thành {X}% bài tập.}
{Hoặc: "Bà không tập hôm nay" + lý do nếu có}

🏠 Di chuyển:
{Phòng ngủ: {X}h | Phòng khách: {X}h | WC: {X} phút ({Y} lần)}
{Đi WC đêm: {X} lần. Bất thường: {có/không}}
{Hoặc chỉ 1 phòng: bỏ qua section này}

🚪 Khách thăm:
{X lượt khách ({liệt kê giờ, thời gian}).}
{Hoặc: "Không có khách hôm nay"}

🌡️ Phòng bà:
Nhiệt độ trung bình {avg}°C (thấp nhất {min}°C, cao nhất {max}°C).
Độ ẩm trung bình {avg}%.
{Cảnh báo thời tiết: nếu có alert hôm nay}
{Cảnh báo nếu ngoài ngưỡng thoải mái 20-35°C hoặc 40-80%}

💡 Ghi chú AI:
{1-2 câu nhận xét tự động dựa trên data: trend, pattern, suggestion}
```

### Quy tắc viết report

1. **Ngắn gọn:** Mỗi section 1-3 câu. Tổng report không quá 300 từ.
2. **Tự nhiên:** Viết như người nhắn tin, không formal quá.
3. **Highlight SOS:** Nếu có SOS hôm nay → đưa LÊN ĐẦU report, trước mọi section khác.
4. **Nhắc gọi:** Nếu không ai gọi bà → thêm cuối: "💬 Nhắc: Bà chưa được gọi hôm nay. Gọi chào bà khi có thể nhé!"
5. **Ngày yên bình:** Nếu không có gì đặc biệt → report rút gọn:
   "📊 Ngày {date}: Một ngày bình thường, bà khỏe, không có gì đặc biệt ✅"

### Bước 4: Gửi Zalo group

Gửi report vào Zalo group gia đình (đọc từ memory `eldercare_contacts`).
Nếu chưa có group config → gửi vào channel hiện tại.

### Bước 5: Lưu report vào memory

```
eldercare_daily_report_{YYYY-MM-DD}: { "report": "{full text}", "sent_at": "{timestamp}" }
```

Để có thể tra cứu lại: "báo cáo ngày hôm qua", "xem lại báo cáo tuần trước".

## Xử lý trường hợp đặc biệt

**Mới cài, chưa có data:**
→ Gửi: "📊 Hệ thống mới hoạt động, đang thu thập dữ liệu. Báo cáo chi tiết sẽ có từ ngày mai."

**Có SOS hôm nay:**
→ Đưa SOS event lên ĐẦU TIÊN:
```
🚨 SỰ KIỆN QUAN TRỌNG:
SOS lúc {giờ} — nguồn: {nút bấm/AI detect/manual}.
Mức escalation: Level {X}. Xử lý bởi: {tên}. Thời gian phản hồi: {X} phút.
```
Rồi mới đến các section bình thường.

**HA không kết nối:**
→ Bỏ qua section sensor, ghi chú: "⚠️ Không đọc được dữ liệu sensor hôm nay (HA offline)."

**Không ai gọi bà:**
→ Thêm cuối report:
"💬 Nhắc: Bà chưa được gọi hôm nay. Gọi chào bà khi có thể nhé!"

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

- `sensor.grandma_room_temperature` → `elder.ha_entities.temperature`
- `sensor.grandma_room_humidity` → `elder.ha_entities.humidity`
- `sensor.grandma_room_motion_minutes` → `elder.ha_entities.motion`
- Memory: ALL `eldercare_*` keys → `eldercare_{elder.id}_*` prefix
- Memory: `eldercare_daily_report_*` → `eldercare_{elder.id}_daily_report_*`
- Contacts: `eldercare_contacts` → `elder.contacts`
- Report: Generate separate section for each elder, e.g. "📋 Báo cáo Bà Nội:", "📋 Báo cáo Ông Nội:"
