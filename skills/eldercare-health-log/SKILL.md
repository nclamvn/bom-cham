---
name: eldercare-health-log
description: |
  Theo dõi sức khoẻ người thân cao tuổi. Gia đình nhập qua chat:
  - Huyết áp: "huyết áp bà 130/80" hoặc "HA 130/80"
  - Đường huyết: "đường huyết 120" hoặc "ĐH 120"
  - Nhịp tim: "nhịp tim 75" hoặc "NT 75"
  - Cân nặng: "cân nặng 45kg" hoặc "CN 45"
  - Nhiệt độ cơ thể: "nhiệt độ 37.2" hoặc "sốt 38.5"
  - SpO2: "SpO2 96" hoặc "oxy 96"
  - Ghi chú tự do: "bà ho nhiều hôm nay", "bà ăn ít"
  Dữ liệu lưu memory, hiển thị trend trong daily report.
  Cảnh báo khi chỉ số ngoài ngưỡng an toàn.
homepage: https://github.com/nclamvn/bom-cham
metadata:
  {
    "openclaw":
      {
        "emoji": "💊",
      },
  }
---

# Eldercare Health Log — Theo dõi sức khoẻ

Skill này cho phép gia đình nhập chỉ số sức khoẻ của bà qua bất kỳ kênh chat nào (Zalo, Telegram, WhatsApp, Viber). Hệ thống parse, validate, lưu vào memory, và cảnh báo khi bất thường.

## Cách nhập liệu

Gia đình nhắn qua bất kỳ channel nào. Hệ thống tự detect intent + parse giá trị.

### Formats chấp nhận

| Loại | Cách nhập (ví dụ) | Parse thành |
|------|-------------------|-------------|
| Huyết áp | "huyết áp bà 130/80", "HA 130/80", "bp 130/80" | systolic=130, diastolic=80 |
| Đường huyết | "đường huyết 120", "ĐH 120", "blood sugar 120" | glucose=120 mg/dL |
| Nhịp tim | "nhịp tim 75", "NT 75", "heart rate 75" | heartRate=75 bpm |
| Cân nặng | "cân nặng 45", "CN 45kg", "weight 45" | weight=45 kg |
| Nhiệt độ | "nhiệt độ 37.2", "sốt 38.5", "temp 37.2" | temperature=37.2 °C |
| SpO2 | "SpO2 96", "oxy 96" | spo2=96 % |
| Ghi chú | "bà ho nhiều", "bà ăn ít", "bà ngủ không ngon" | note (free text) |

### Keywords tiếng Việt

Mỗi loại chỉ số có nhiều cách viết:

- **Huyết áp:** "huyết áp", "huyet ap", "HA", "ha", "bp", "blood pressure"
- **Đường huyết:** "đường huyết", "duong huyet", "ĐH", "blood sugar", "glucose"
- **Nhịp tim:** "nhịp tim", "nhip tim", "NT", "heart rate", "pulse"
- **Cân nặng:** "cân nặng", "can nang", "CN", "weight"
- **Nhiệt độ:** "nhiệt độ", "nhiet do", "sốt", "sot", "temp", "temperature"
- **SpO2:** "spo2", "SpO2", "oxy", "oxygen"

### Xử lý nhập liệu

Khi nhận message có chứa health keywords:

1. **Parse message** → detect metric type từ keywords
2. **Extract giá trị** (regex + fuzzy match):
   - Huyết áp: tìm pattern `\d+/\d+` (ví dụ 130/80)
   - Đường huyết, nhịp tim, cân nặng: tìm số đơn `\d+(\.\d+)?`
   - Nhiệt độ: tìm số thập phân `\d+\.\d+` hoặc số nguyên
   - SpO2: tìm số nguyên 50-100
3. **Validate**: giá trị trong khoảng hợp lệ?
   - Huyết áp: systolic 40-250, diastolic 30-200
   - Đường huyết: 20-600
   - Nhịp tim: 20-300
   - Cân nặng: 15-200
   - Nhiệt độ: 34-43
   - SpO2: 50-100
4. **Đánh giá status** (xem bảng ngưỡng bên dưới):
   - "normal", "low", "high", hoặc "dangerous"
5. **Lưu memory** key: `eldercare_health_{type}_{timestamp}`
6. **Reply xác nhận**

### Reply patterns

- **Bình thường:** "✅ Đã ghi huyết áp bà: 130/80 mmHg (bình thường)"
- **Cao/thấp:** "⚠️ Đã ghi huyết áp bà: 150/95 mmHg — HƠI CAO. Theo dõi thêm."
- **Nguy hiểm:** "🚨 Huyết áp bà 180/110 mmHg — NGUY HIỂM. Cần liên hệ bác sĩ NGAY."
- **Lỗi format:** "Không hiểu giá trị. Ví dụ: huyết áp 130/80"

### Memory format

Khi lưu memory, sử dụng key `eldercare_health_{type}_{YYYYMMDD_HHmm}` với value:

```json
{
  "type": "blood_pressure",
  "timestamp": "2026-02-19T10:30:00+07:00",
  "values": { "systolic": 130, "diastolic": 80 },
  "unit": "mmHg",
  "recorded_by": "Con Lan (Zalo)",
  "status": "normal",
  "note": ""
}
```

Các type: `blood_pressure`, `glucose`, `heart_rate`, `weight`, `temperature`, `spo2`, `note`.

## Ngưỡng cảnh báo

| Chỉ số | Thấp | Bình thường | Cao | Nguy hiểm |
|--------|------|-------------|-----|-----------|
| Huyết áp tâm thu | <90 | 90-139 | 140-179 | ≥180 |
| Huyết áp tâm trương | <60 | 60-89 | 90-119 | ≥120 |
| Đường huyết (đói) | <70 | 70-100 | 101-125 | ≥126 hoặc <54 |
| Nhịp tim | <50 | 50-100 | 101-120 | >120 hoặc <40 |
| Nhiệt độ | <35.5 | 35.5-37.4 | 37.5-38.4 | ≥38.5 |
| SpO2 | — | 95-100 | 90-94 | <90 |

### Cảnh báo nguy hiểm

Khi chỉ số ở mức NGUY HIỂM:

1. Reply ngay: "🚨 [Chỉ số] ở mức NGUY HIỂM: [giá trị]. Cần liên hệ bác sĩ NGAY."
2. Gửi Zalo group gia đình (nếu người nhập không phải group) — qua messaging tool
3. Lưu memory với status: "dangerous"
4. Hiển thị highlight trong daily report

## Tích hợp Daily Report

Skill `eldercare-daily-report` sẽ query memory keys `eldercare_health_*` cho ngày hiện tại:

- Liệt kê tất cả chỉ số đã nhập trong ngày
- So sánh với lần đo trước (trend: ↑ tăng, ↓ giảm, → ổn định)
- Highlight các giá trị bất thường

Ví dụ section trong report:

```
💊 Sức khoẻ:
  Huyết áp: 130/80 mmHg (→ ổn định so với hôm qua 128/78)
  Đường huyết: 115 mg/dL (↑ tăng nhẹ, hôm qua 98 — theo dõi)
  Cân nặng: 45 kg (→ không đổi)
  Ghi chú: "Bà ho nhiều hôm nay" — Con Lan ghi lúc 15:00
```

## Xem lịch sử

Gia đình có thể hỏi qua chat:

- "lịch sử huyết áp bà" → 7 ngày gần nhất, mỗi ngày 1 dòng
- "huyết áp bà tuần này" → tổng hợp tuần (min/max/average)
- "sức khoẻ bà" → tổng hợp tất cả chỉ số gần nhất (mỗi loại 1 dòng)
- "đường huyết bà tháng này" → biểu đồ text trend 30 ngày

Khi trả lời lịch sử:

1. Query memory: tìm keys `eldercare_health_{type}_*` trong khoảng thời gian
2. Sort by timestamp descending
3. Format bảng tiếng Việt gọn gàng
4. Nêu trend: so sánh lần đầu và lần cuối trong khoảng

Ví dụ:

```
📊 Huyết áp bà — 7 ngày gần nhất:
  20/02: 130/80 ✅
  19/02: 128/78 ✅
  18/02: 145/92 ⚠️ cao
  17/02: 135/85 ✅
  16/02: 132/82 ✅
  Trend: → ổn định (trung bình 134/83)
```

## Ghi chú tự do

Ngoài chỉ số số, gia đình có thể ghi chú:

- "bà ho nhiều hôm nay"
- "bà ăn ít buổi trưa"
- "bà ngủ không ngon đêm qua"
- "bà kêu đau lưng"
- "bà mệt, không muốn ăn"

Detect intent: nếu message chứa "bà" + symptom keywords (ho, ăn ít, ngủ, đau, mệt), lưu memory:

```json
{
  "type": "note",
  "timestamp": "2026-02-19T15:00:00+07:00",
  "text": "Bà ho nhiều hôm nay",
  "recorded_by": "Con Lan (Zalo)",
  "status": "noted"
}
```

Reply: "📝 Đã ghi chú: Bà ho nhiều hôm nay"
