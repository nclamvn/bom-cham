![Version](https://img.shields.io/badge/version-1.0.0-green)
![Skills](https://img.shields.io/badge/skills-18-blue)
![License](https://img.shields.io/badge/license-MIT-yellow)

# Bom Cham -- AI cham soc nguoi than cao tuoi

> "De gia dinh yen tam, de ong ba an vui"

Bom Cham la nen tang AI cham soc nguoi cao tuoi tai nha. Tich hop cam bien,
camera, loa thong minh -- giam sat 24/7, canh bao qua Zalo/Telegram/WhatsApp/Viber,
ho tro giai tri va sinh hoat.

Ho tro **nhieu nguoi than** (ba noi, ong noi, bo me...) voi profile rieng cho tung nguoi.
Gia dinh xem trang thai tren **Family PWA** -- dung nhu app tren dien thoai.

## Kien truc

```
[Sensors]  ->  [Home Assistant]  ->  [Bom Cham Gateway]  ->  [Zalo/TG/WA/Viber]
  FP2            Raspberry Pi          Docker                 Gia dinh
  Camera                               18 AI Skills
  SOS Button                           Multi-elder
                                            |
                                       [Admin UI]     -- Cho nguoi cai dat
                                       [Family PWA]   -- Cho gia dinh xem tren dien thoai
                                       [Wizard]       -- Cai dat lan dau
```

## 18 Skills

### Giam sat & An toan
| # | Skill | Mo ta |
|---|-------|-------|
| 1 | eldercare-monitor | Giam sat 24/7, 4 muc canh bao, check moi 5 phut |
| 2 | eldercare-sos | SOS 3 cap: nut bam -> Zalo -> goi 115 |
| 3 | eldercare-fall-detect | Phat hien te nga 2 layer (FP2 + AI pattern) |
| 4 | eldercare-multi-room | Giam sat nhieu phong, an toan nha ve sinh |
| 5 | eldercare-visitor-log | Ghi nhan khach tham tu presence sensor |

### Suc khoe
| # | Skill | Mo ta |
|---|-------|-------|
| 6 | eldercare-health-log | Huyet ap, duong huyet, nhip tim qua chat |
| 7 | eldercare-medication | Nhac uong thuoc qua TTS + Zalo |
| 8 | eldercare-sleep-tracker | Phan tich giac ngu tu mmWave sensor |
| 9 | eldercare-exercise | Bai tap tai giuong voi TTS huong dan |
| 10 | eldercare-emergency-contacts | Danh sach cap cuu, ho so y te |

### Giai tri & Sinh hoat
| # | Skill | Mo ta |
|---|-------|-------|
| 11 | eldercare-companion | Nhac bolero, doc truyen, nhac uong nuoc |
| 12 | eldercare-videocall | Goi video tu chat command |
| 13 | eldercare-weather-alert | Canh bao thoi tiet cuc doan |

### He thong
| # | Skill | Mo ta |
|---|-------|-------|
| 14 | eldercare-daily-report | Bao cao tong ket 21h moi toi |
| 15 | eldercare-offline-queue | Dam bao khong mat alert, retry tu dong |
| 16 | eldercare-profiles | Quan ly nhieu nguoi than (multi-elder) |
| 17 | openai-whisper-api | Voice-to-text cho tieng Viet |
| 18 | sherpa-onnx-tts | Text-to-speech offline |

## Multi-elder

Bom Cham ho tro cham soc nhieu nguoi cung luc:

- **1 nguoi (mac dinh):** Hoat dong y het, khong can cau hinh them
- **Nhieu nguoi:** Them profile qua chat "them ong noi" hoac qua Wizard
- **Moi nguoi co:** Sensors rieng, contacts rieng, medication rieng
- **Memory keys:** `eldercare_{elder_id}_*` (namespaced)
- **Backward compatible:** Khong co profiles -> auto-migrate "ba_noi"

## Family PWA

Dashboard cho gia dinh xem tren dien thoai:

- **URL:** `http://bom-cham:18789/family/`
- **Vanilla JS** -- nhe, nhanh, chay tren dien thoai cu
- **Tieng Viet 100%**, font lon, nut lon
- **Add to Home Screen** nhu app that
- Hien thi: trang thai, nhiet do, giac ngu, thuoc, timeline, canh bao
- Thao tac nhanh: goi, mo nhac, nhan tin qua loa, camera

## Onboarding Wizard

Setup lan dau 5 buoc:

1. Chao mung
2. Thong tin nguoi than (ten, tuoi, van dong, thinh luc)
3. Gia dinh nhan thong bao (contacts)
4. Ket noi Home Assistant (URL + token + test)
5. Hoan tat + huong dan Add to Home Screen

**URL:** `http://bom-cham:18789/family/wizard.html`

## Phan cung can

| Thiet bi | Gia uoc tinh |
|----------|-------------|
| Raspberry Pi 5 + phu kien | ~2,500,000d |
| Cam bien Aqara FP2 | ~1,200,000d |
| Tablet Android 10" | ~5,000,000d |
| Loa Bluetooth | ~800,000d |
| Camera IP | ~1,000,000d |
| Nut SOS Zigbee | ~200,000d |
| **Tong** | **~12,000,000d** |

## Quick Start

1. Clone repo: `git clone https://github.com/nclamvn/bom-cham`
2. Copy env: `cp .env.example .env` -> dien API keys
3. Chay: `docker-compose up -d`
4. Mo Wizard: `http://localhost:18789/family/wizard.html`
5. Cai dat 5 buoc -> bat dau su dung

## Tech Stack

- **Runtime:** Node.js 22 (ESM)
- **AI:** Claude / GPT-4o / Gemini / Ollama
- **IoT:** Home Assistant + Zigbee
- **Messaging:** Zalo, Telegram, WhatsApp, Viber
- **Admin UI:** LitElement + TypeScript
- **Family PWA:** Vanilla HTML/CSS/JS
- **Deploy:** Docker

## 4 Channels

| Channel | Trang thai |
|---------|-----------|
| Telegram | Bot API |
| WhatsApp | QR link |
| Google Chat | Chat API |
| Viber | REST API |

## License

MIT
