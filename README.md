![Version](https://img.shields.io/badge/version-1.0.0-green)
![Skills](https://img.shields.io/badge/skills-18-blue)
![License](https://img.shields.io/badge/license-MIT-yellow)

# Bờm Chăm — AI chăm sóc người thân cao tuổi

> "Để gia đình yên tâm, để ông bà an vui"

Bờm Chăm là nền tảng AI chăm sóc người cao tuổi tại nhà. Tích hợp cảm biến,
camera, loa thông minh — giám sát 24/7, cảnh báo qua Zalo/Telegram/WhatsApp/Viber,
hỗ trợ giải trí và sinh hoạt.

Hỗ trợ **nhiều người thân** (bà nội, ông nội, bố mẹ...) với profile riêng cho từng người.
Gia đình xem trạng thái trên **Family PWA** — dùng như app trên điện thoại.

## Kiến trúc

```
[Cảm biến]  ->  [Home Assistant]  ->  [Bờm Chăm Gateway]  ->  [Zalo/TG/WA/Viber]
  FP2             Raspberry Pi          Docker                  Gia đình
  Camera                                18 AI Skills
  Nút SOS                               Multi-elder
                                              |
                                         [Admin UI]     -- Cho người cài đặt
                                         [Family PWA]   -- Cho gia đình xem trên điện thoại
                                         [Wizard]       -- Cài đặt lần đầu
```

## 18 Skills

### Giám sát & An toàn
| # | Skill | Mô tả |
|---|-------|-------|
| 1 | eldercare-monitor | Giám sát 24/7, 4 mức cảnh báo, kiểm tra mỗi 5 phút |
| 2 | eldercare-sos | SOS 3 cấp: nút bấm → Zalo → gọi 115 |
| 3 | eldercare-fall-detect | Phát hiện té ngã 2 lớp (FP2 + AI pattern) |
| 4 | eldercare-multi-room | Giám sát nhiều phòng, an toàn nhà vệ sinh |
| 5 | eldercare-visitor-log | Ghi nhận khách thăm từ presence sensor |

### Sức khoẻ
| # | Skill | Mô tả |
|---|-------|-------|
| 6 | eldercare-health-log | Huyết áp, đường huyết, nhịp tim qua chat |
| 7 | eldercare-medication | Nhắc uống thuốc qua TTS + Zalo |
| 8 | eldercare-sleep-tracker | Phân tích giấc ngủ từ mmWave sensor |
| 9 | eldercare-exercise | Bài tập tại giường với TTS hướng dẫn |
| 10 | eldercare-emergency-contacts | Danh sách cấp cứu, hồ sơ y tế |

### Giải trí & Sinh hoạt
| # | Skill | Mô tả |
|---|-------|-------|
| 11 | eldercare-companion | Nhạc bolero, đọc truyện, nhắc uống nước |
| 12 | eldercare-videocall | Gọi video từ chat command |
| 13 | eldercare-weather-alert | Cảnh báo thời tiết cực đoan |

### Hệ thống
| # | Skill | Mô tả |
|---|-------|-------|
| 14 | eldercare-daily-report | Báo cáo tổng kết 21h mỗi tối |
| 15 | eldercare-offline-queue | Đảm bảo không mất alert, retry tự động |
| 16 | eldercare-profiles | Quản lý nhiều người thân (multi-elder) |
| 17 | openai-whisper-api | Voice-to-text cho tiếng Việt |
| 18 | sherpa-onnx-tts | Text-to-speech offline |

## Multi-elder

Bờm Chăm hỗ trợ chăm sóc nhiều người cùng lúc:

- **1 người (mặc định):** Hoạt động y hệt, không cần cấu hình thêm
- **Nhiều người:** Thêm profile qua chat "thêm ông nội" hoặc qua Wizard
- **Mỗi người có:** Sensors riêng, contacts riêng, medication riêng
- **Memory keys:** `eldercare_{elder_id}_*` (namespaced)
- **Tương thích ngược:** Không có profiles → auto-migrate "ba_noi"

## Family PWA

Dashboard cho gia đình xem trên điện thoại:

- **URL:** `http://bom-cham:18789/family/`
- **Vanilla JS** — nhẹ, nhanh, chạy trên điện thoại cũ
- **Tiếng Việt 100%**, font lớn, nút lớn
- **Add to Home Screen** như app thật
- Hiển thị: trạng thái, nhiệt độ, giấc ngủ, thuốc, timeline, cảnh báo
- Thao tác nhanh: gọi, mở nhạc, nhắn tin qua loa, camera

## Onboarding Wizard

Cài đặt lần đầu 5 bước:

1. Chào mừng
2. Thông tin người thân (tên, tuổi, vận động, thính lực)
3. Gia đình nhận thông báo (contacts)
4. Kết nối Home Assistant (URL + token + test)
5. Hoàn tất + hướng dẫn Add to Home Screen

**URL:** `http://bom-cham:18789/family/wizard.html`

## Phần cứng cần thiết

| Thiết bị | Giá ước tính |
|----------|-------------|
| Raspberry Pi 5 + phụ kiện | ~2.500.000đ |
| Cảm biến Aqara FP2 | ~1.200.000đ |
| Tablet Android 10" | ~5.000.000đ |
| Loa Bluetooth | ~800.000đ |
| Camera IP | ~1.000.000đ |
| Nút SOS Zigbee | ~200.000đ |
| **Tổng** | **~12.000.000đ** |

## Bắt đầu nhanh

1. Clone repo: `git clone https://github.com/nclamvn/bom-cham`
2. Copy env: `cp .env.example .env` → điền API keys
3. Chạy: `docker-compose up -d`
4. Mở Wizard: `http://localhost:18789/family/wizard.html`
5. Cài đặt 5 bước → bắt đầu sử dụng

## Tech Stack

- **Runtime:** Node.js 22 (ESM)
- **AI:** Claude / GPT-4o / Gemini / Ollama
- **IoT:** Home Assistant + Zigbee
- **Messaging:** Zalo, Telegram, WhatsApp, Viber
- **Admin UI:** LitElement + TypeScript
- **Family PWA:** Vanilla HTML/CSS/JS
- **Deploy:** Docker

## 4 Kênh nhắn tin

| Kênh | Trạng thái |
|------|-----------|
| Telegram | Bot API |
| WhatsApp | QR link |
| Google Chat | Chat API |
| Viber | REST API |

## Giấy phép

MIT
