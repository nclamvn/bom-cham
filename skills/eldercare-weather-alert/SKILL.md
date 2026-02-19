---
name: eldercare-weather-alert
description: |
  Cảnh báo thời tiết cực đoan cho gia đình chăm sóc người cao tuổi.
  Check thời tiết 2 lần/ngày (6h + 18h). Cảnh báo:
  - Lạnh < 18C → "Đắp thêm chăn cho bà"
  - Nóng > 35C → "Bật quạt/AC, cho bà uống nước"
  - Mưa bão → "Đóng cửa sổ phòng bà"
  - Độ ẩm thấp < 40% → "Bật máy tạo ẩm"
  Dùng 3 nguồn: HA outdoor sensor, HA indoor sensor, Open-Meteo API.
metadata:
  {
    "openclaw":
      {
        "emoji": "🌤️",
        "schedule":
          [
            {
              "kind": "cron",
              "expr": "0 6,18 * * *",
              "tz": "Asia/Ho_Chi_Minh",
              "description": "Check thời tiết sáng 6h + chiều 18h",
            },
          ],
      },
  }
---

# Eldercare Weather Alert — Cảnh báo thời tiết

Skill check thời tiết 2 lần/ngày, chỉ cảnh báo khi có điều kiện cực đoan ảnh hưởng sức khoẻ người cao tuổi. KHÔNG gửi gì khi thời tiết bình thường (không spam).

## Data sources (thứ tự ưu tiên)

### Source 1: HA Outdoor Sensor (nếu có)

Nếu gia đình có sensor ngoài trời:

```
action: get_state
entity_id: sensor.outdoor_temperature
```
```
action: get_state
entity_id: sensor.outdoor_humidity
```

Nếu entity tồn tại và available → dùng data này. Nếu không → Source 2.

### Source 2: HA Indoor Sensor (luôn có)

Dùng sensor phòng bà đã có:

```
action: get_state
entity_id: sensor.grandma_room_temperature
```
```
action: get_state
entity_id: sensor.grandma_room_humidity
```

Nhiệt độ phòng phản ánh phần nào thời tiết (đặc biệt nếu phòng không có AC).
Lưu ý: nếu phòng có AC/sưởi → nhiệt độ phòng không phản ánh ngoài trời.

### Source 3: Open-Meteo API (free, backup)

Nếu Source 1 không có, dùng web fetch:

```
URL: https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia/Ho_Chi_Minh
```

Toạ độ mặc định: Biên Hoà, Đồng Nai (10.95, 106.83).
Gia đình có thể thay đổi trong config.

**Open-Meteo weather codes (WMO):**
- 0: Trời quang
- 1-3: Ít mây → nhiều mây
- 45-48: Sương mù
- 51-57: Mưa phùn
- 61-67: Mưa
- 71-77: Tuyết (ít xảy ra ở VN)
- 80-82: Mưa rào
- 95-99: Mưa giông / bão

## Cron handler (6h + 18h)

### Bước 1: Lấy thời tiết

Thử Source 1 → 2 → 3 theo thứ tự. Ghi lại source đã dùng.

### Bước 2: Đánh giá conditions

| Condition | Ngưỡng | Mức | Alert message (Zalo) |
|-----------|--------|-----|---------------------|
| Rất lạnh | < 15C | HIGH | "🥶 Trời rất lạnh {X}C! Đắp 2 chăn, kiểm tra cửa sổ phòng bà." |
| Lạnh | 15-18C | MEDIUM | "🌡️ Trời lạnh {X}C. Nhắc đắp thêm chăn cho bà nha." |
| Nóng | 35-38C | MEDIUM | "🌡️ Trời nóng {X}C. Bật quạt/AC phòng bà, cho bà uống thêm nước." |
| Rất nóng | > 38C | HIGH | "🔥 Trời rất nóng {X}C! Bật AC phòng bà, đảm bảo bà uống đủ nước." |
| Ẩm thấp | < 40% | LOW | "💨 Độ ẩm thấp {X}%. Bật máy tạo ẩm hoặc đặt khăn ướt phòng bà." |
| Ẩm cao | > 85% | LOW | "💧 Độ ẩm cao {X}%. Bật quạt thông gió phòng bà." |
| Mưa bão | WMO 95-99 | HIGH | "⛈️ Có mưa bão. Đóng cửa sổ phòng bà, kiểm tra mái." |
| Mưa rào | WMO 80-82 | LOW | "🌧️ Có mưa rào. Nhắc đóng cửa sổ phòng bà." |

### Bước 3: Context kết hợp phòng bà

Khi cảnh báo nhiệt độ, so sánh outdoor vs indoor (nếu có cả 2):

- Trời lạnh 16C NHƯNG phòng bà 25C → bổ sung: "Phòng bà ấm (25C), OK nhưng chú ý khi mở cửa"
- Trời lạnh 16C VÀ phòng bà 18C → bổ sung: "Phòng bà cũng lạnh ({X}C)! Cần bật sưởi/đắp chăn"
- Trời nóng 36C VÀ phòng bà 35C → bổ sung: "Phòng bà cũng nóng! Bật AC/quạt NGAY"
- Trời nóng 36C NHƯNG phòng bà 27C → bổ sung: "AC phòng bà đang hoạt động tốt ✅"

### Bước 4: Gửi hoặc skip

- Nếu có condition bất thường → gửi Zalo group gia đình
- Nếu KHÔNG có condition bất thường → KHÔNG gửi (silent)
- Ghi lại: lưu memory `eldercare_weather_{date}_{morning/evening}`

### Bước 5: Lưu memory

Key: `eldercare_weather_{YYYY-MM-DD}_{morning|evening}`

```json
{
  "date": "2026-02-20",
  "time": "06:00",
  "source": "open-meteo",
  "outdoor_temp": 28,
  "outdoor_humidity": 70,
  "indoor_temp": 26,
  "indoor_humidity": 65,
  "weather_code": 1,
  "conditions": [],
  "alert_sent": false
}
```

## Tích hợp daily report

```
🌤️ Thời tiết: 28C, ẩm 70% — bình thường, không cảnh báo
```
hoặc
```
🌤️ Thời tiết: Sáng lạnh 17C → đã gửi nhắc gia đình. Chiều ấm hơn 24C.
```

## Chat query

- "thời tiết" / "weather" → hiển thị nhiệt độ + ẩm hiện tại + forecast
- "phòng bà bao nhiêu độ" → indoor temp + humidity

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
- `sensor.outdoor_temperature` and `sensor.outdoor_humidity` remain global (shared)
- Memory: `eldercare_weather_{date}_*` → `eldercare_{elder.id}_weather_{date}_*`
- Messages: Include `elder.name` in weather alerts, e.g. "Phòng Bà Nội: 36°C — nóng"
