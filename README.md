# Bom Cham -- AI cham soc nguoi than

> "De gia dinh yen tam, de ong ba an vui"

Bom Cham la nen tang AI cham soc nguoi cao tuoi, nguoi yeu benh
tai nha. Tich hop cam bien, camera, loa thong minh -- giam sat 24/7,
canh bao qua Zalo/Telegram/WhatsApp, ho tro giai tri va sinh hoat.

## Tinh nang

- **Giam sat 24/7** -- Cam bien mmWave, check moi 5 phut
- **SOS 3 cap** -- Nut bam -> Zalo -> goi dien -> tat ca
- **Phat hien te nga** -- AI pattern + xac nhan truoc khi bao
- **Video call** -- Nhan "goi ba" -> phong san sang -> Zalo video
- **Ban dong hanh** -- Nhac bolero, doc truyen, nhac uong nuoc
- **Theo doi giac ngu** -- Phan tich chat luong giac ngu tu cam bien
- **Tap the duc** -- Bai tap tai giuong voi TTS huong dan
- **Canh bao thoi tiet** -- Bao dong khi qua nong/lanh/bao
- **Ghi nhan khach tham** -- Phat hien khach tu presence sensor
- **Giam sat nhieu phong** -- An toan WC, theo doi di chuyen
- **Nhat ky suc khoe** -- Huyet ap, duong huyet, nhip tim qua chat
- **Nhac uong thuoc** -- TTS nhac gio uong thuoc
- **Lien lac cap cuu** -- SOS tich hop 115/113, ho so benh
- **Bao cao moi toi** -- 21h nhan tong ket ngay qua Zalo
- **Khong mat alert** -- Queue offline, retry tu dong
- **4 kenh** -- Zalo, Telegram, WhatsApp, Viber

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

## Cai dat

Xem [SETUP.md](SETUP.md) de huong dan chi tiet.

## Quick Start

1. Clone repo: `git clone https://github.com/nclamvn/bom-cham`
2. Copy env: `cp .env.example .env` -> dien API keys
3. Chay: `docker-compose up -d`
4. Mo: `http://localhost:18789`

## Tech Stack

- **Runtime:** Node.js 22 (ESM)
- **AI:** Claude / GPT-4o / Gemini / Ollama
- **IoT:** Home Assistant + Zigbee
- **Messaging:** Zalo, Telegram, WhatsApp, Viber
- **UI:** LitElement + TypeScript
- **Deploy:** Docker

## License

MIT
