---
name: eldercare-emergency-contacts
description: |
  Danh sách liên lạc khẩn cấp cho người cao tuổi Việt Nam.
  Tích hợp vào SOS Level 3: cung cấp thông tin y tế cho cấp cứu.
  Gia đình chat "cấp cứu" hoặc "emergency" để xem danh sách.
  Lưu medical profile để sẵn sàng cho nhân viên cấp cứu.
homepage: https://github.com/nclamvn/bom-cham
metadata:
  {
    "openclaw":
      {
        "emoji": "🏥",
      },
  }
---

# Eldercare Emergency Contacts — Liên hệ khẩn cấp

Skill quản lý danh sách liên hệ khẩn cấp và hồ sơ y tế cho người cao tuổi. Tích hợp vào SOS escalation và cung cấp thông tin nhanh cho nhân viên cấp cứu.

## Danh sách mặc định

Số khẩn cấp toàn quốc Việt Nam:

| Loại | Số | Ghi chú |
|------|-----|---------|
| Cấp cứu | 115 | Toàn quốc |
| Công an | 113 | Toàn quốc |
| Cứu hoả | 114 | Toàn quốc |
| Tổng đài y tế | 1900 9095 | Tư vấn y tế 24/7 |

Danh sách này luôn có sẵn, không cần config.

## Danh sách tuỳ chỉnh

Gia đình thêm contacts qua chat hoặc config trực tiếp memory key `eldercare_emergency_list`.

### Thêm qua chat:

- "thêm bác sĩ: BS Nguyễn Văn A — 0901234567"
- "thêm bệnh viện: BV Đồng Nai — 02513822234"
- "thêm nhà thuốc: Nhà thuốc An Khang — 0281234567"
- "cập nhật bệnh viện gần nhất: BV Chợ Rẫy — 02838554137"

### Memory format (eldercare_emergency_list):

```json
{
  "location": {
    "city": "Biên Hoà",
    "province": "Đồng Nai",
    "address": "123 Đường ABC, P. Tân Hiệp, Biên Hoà"
  },
  "nearest_hospital": {
    "name": "Bệnh viện Đa khoa Đồng Nai",
    "phone": "02513822234",
    "address": "128 Đường 30/4, P. Thanh Bình, Biên Hoà",
    "emergency_phone": "02513822234",
    "distance_km": 5
  },
  "family_doctor": {
    "name": "",
    "phone": "",
    "clinic": ""
  },
  "pharmacy": {
    "name": "",
    "phone": ""
  },
  "custom_contacts": [
    {
      "role": "Bác sĩ riêng",
      "name": "BS Nguyễn Văn A",
      "phone": "0901234567",
      "note": "Khám tại nhà"
    }
  ]
}
```

## Medical Profile

Hồ sơ y tế của bà — cung cấp cho nhân viên cấp cứu khi SOS Level 3.

### Memory key: eldercare_medical_profile

```json
{
  "name": "Bà Nguyễn Thị B",
  "age": 90,
  "date_of_birth": "1936-03-15",
  "blood_type": "O+",
  "allergies": ["Penicillin"],
  "chronic_conditions": ["Tăng huyết áp", "Tiểu đường type 2"],
  "current_medications": [
    "Amlodipine 5mg (sáng + tối)",
    "Metformin 500mg (sáng + chiều)",
    "Vitamin D3 (sáng)"
  ],
  "mobility": "Nằm giường, không tự đi lại",
  "hearing": "Nặng tai, cần nói to",
  "vision": "Đeo kính cận",
  "weight_kg": 45,
  "special_notes": "Minh mẫn, hiểu biết tình trạng sức khoẻ",
  "insurance": {
    "type": "BHYT",
    "number": "",
    "hospital": "BV Đa khoa Đồng Nai"
  }
}
```

### Cập nhật qua chat:

- "nhóm máu bà: O+" → cập nhật `blood_type`
- "bà dị ứng penicillin" → thêm vào `allergies[]`
- "bà bị tiểu đường" → thêm vào `chronic_conditions[]`
- "cân nặng bà 45kg" → cập nhật `weight_kg` (tích hợp với health-log)
- "bà đeo kính cận" → cập nhật `vision`
- "BHYT bà số 123456" → cập nhật `insurance.number`

Reply xác nhận: "✅ Đã ghi nhóm máu bà: O+"

## Tích hợp SOS

Khi SOS Level 3 triggered (skill `eldercare-sos`):

### Thông tin gửi kèm SOS message:

```
🏥 THÔNG TIN Y TẾ (cho cấp cứu):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Bà Nguyễn Thị B, 90 tuổi
Nhóm máu: O+
Dị ứng: Penicillin
Bệnh nền: Tăng huyết áp, Tiểu đường type 2
Thuốc đang dùng:
  - Amlodipine 5mg (sáng + tối)
  - Metformin 500mg (sáng + chiều)
Vận động: Nằm giường, không tự đi lại
Thính lực: Nặng tai

📍 Địa chỉ: 123 Đường ABC, Biên Hoà
📞 BV Đồng Nai: 02513822234
📞 Cấp cứu: 115
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Gửi kèm SOS message vào Zalo/Telegram group để gia đình có sẵn thông tin đọc cho 115.

### SOS thêm hướng dẫn:

```
📋 Khi gọi 115:
1. Nói: "Cần cấp cứu tại [địa chỉ]"
2. Bệnh nhân: Bà [tên], 90 tuổi
3. Tình trạng: [mô tả từ SOS trigger]
4. Bệnh nền: [list]
5. Dị ứng thuốc: [list]
6. Nhóm máu: [blood_type]
```

## Query bằng chat

Gia đình có thể hỏi:

### "cấp cứu" / "emergency" / "khẩn cấp"

Hiển thị full dashboard:

```
🚨 LIÊN HỆ KHẨN CẤP
━━━━━━━━━━━━━━━━━━━
📞 Cấp cứu: 115
📞 Công an: 113
📞 Cứu hoả: 114

🏥 BV gần nhất: BV Đồng Nai — 02513822234
   128 Đường 30/4, Biên Hoà (~5km)

👨‍⚕️ BS riêng: BS Nguyễn Văn A — 0901234567

📋 Thông tin y tế bà: nhóm máu O+, dị ứng Penicillin
   Bệnh nền: Tăng huyết áp, Tiểu đường
```

### "bệnh viện gần nhất" / "hospital"

Hiển thị thông tin BV:

```
🏥 Bệnh viện Đa khoa Đồng Nai
📞 02513822234
📍 128 Đường 30/4, P. Thanh Bình, Biên Hoà
🚗 ~5km từ nhà
```

### "thông tin y tế bà" / "medical profile"

Hiển thị full medical profile (format như phần trên).

### "gọi 115" / "gọi cấp cứu"

Hướng dẫn chi tiết + cung cấp script đọc cho tổng đài:

```
📞 GỌI 115 — Chuẩn bị trước khi gọi:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Bình tĩnh, nói rõ ràng
2. Địa chỉ: [address]
3. Bệnh nhân: [name], [age] tuổi
4. Tình trạng hiện tại: [mô tả]
5. Bệnh nền: [chronic_conditions]
6. Thuốc đang dùng: [medications]
7. DỊ ỨNG: [allergies] ← QUAN TRỌNG
8. Nhóm máu: [blood_type]

⏳ Ở yên tại chỗ, giữ đường thở thông, đợi xe cứu thương.
```

## Lưu ý

- **Danh sách mặc định 115/113/114** luôn có, không cần config
- **Medical profile trống OK**: Skill vẫn hoạt động, chỉ thiếu details
- **Privacy**: Thông tin y tế chỉ chia sẻ khi SOS Level 3 hoặc gia đình hỏi
- **Tích hợp health-log**: `current_medications` sync từ `eldercare_medication_list` nếu có
- **Tích hợp health-log (weight)**: `weight_kg` sync từ health records gần nhất
