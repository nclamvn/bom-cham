# Danh sach phan cung Bom Cham

## Mua o dau

| # | Thiet bi | Gia (VND) | Link goi y |
|---|----------|-----------|-------------|
| 1 | Raspberry Pi 5 8GB + case + nguon + microSD 64GB | ~2,500,000 | cytron.vn |
| 2 | Sonoff ZBDongle-E (Zigbee coordinator) | ~300,000 | Shopee |
| 3 | Aqara FP2 mmWave Presence Sensor | ~1,200,000 | Shopee |
| 4 | Aqara Mini Switch (nut SOS) | ~200,000 | Shopee |
| 5 | Aqara LED Bulb (den Zigbee) | ~400,000 | Shopee |
| 6 | Samsung Galaxy Tab A9+ hoac tuong duong | ~5,000,000 | TGDD |
| 7 | Gia do tablet gan giuong | ~500,000 | Shopee |
| 8 | JBL Go 4 hoac loa Bluetooth tuong duong | ~800,000 | TGDD |
| 9 | TP-Link Tapo C225 (camera IP) | ~1,000,000 | TGDD |
| **TONG** | | **~11,900,000** | |

## Thay the re hon

- Pi 5 -> Pi 4 4GB (~1,800,000) -- van du manh
- Tab A9+ -> Tab cu Android 9+ (~2,000,000)
- JBL Go 4 -> Loa BT no-name (~200,000) -- mien co Bluetooth
- Tong toi thieu: **~7,000,000d**

## Ket noi

```
[Raspberry Pi 5] -- USB --> [Sonoff ZBDongle-E]
                                    |
                          Zigbee network
                         /      |        \
                   [Aqara FP2] [SOS btn] [LED bulb]

[Pi 5] -- WiFi --> [Home Assistant]
[Pi 5] -- WiFi --> [Camera IP]
[Pi 5] -- Bluetooth --> [Loa]
[Tablet] -- WiFi --> [Pi 5 gateway]
```
