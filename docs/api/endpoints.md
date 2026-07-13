# API Documentation — Dashboard Doanh Thu

Ngày cập nhật: 2026-07-13  
Base URL: `http://localhost:5001`  
Deploy URL: *(chưa xác định)*

---

## 📋 Records

### GET `/api/records/<YYYY-MM>`
Lấy toàn bộ dữ liệu tháng.

**Response:**
```json
{
  "month": "2025-07",
  "nha_hang": [
    { "ngay": "1.7", "sang": 5000000, "toi": 8000000,
      "tien_ck": 1500000, "tien_ck_thuoc": 200000, "tien_ck_dungcu": 0,
      "tien_tra_hang": 0, "tong": 14700000 }
  ],
  "thuoc": [
    { "ngay": "1.7", "ca1": 3000000, "ca2": 2000000, "ca3": 1500000,
      "ca4": 500000, "ck": 800000, "tra_them": 0, "tong": 7800000 }
  ]
}
```

### POST `/api/records/<YYYY-MM>/nha_hang`
Thêm hoặc cập nhật 1 ngày nhà hàng.

**Request body:**
```json
{
  "ngay": "1.7",
  "sang": 5000000,
  "toi": 8000000,
  "tien_ck": 1500000,
  "tien_ck_thuoc": 200000,
  "tien_ck_dungcu": 0,
  "tien_tra_hang": 0
}
```
*Nếu ngày đã tồn tại → ghi đè (upsert)*

### POST `/api/records/<YYYY-MM>/thuoc`
Thêm hoặc cập nhật 1 ngày thuốc.

**Request body:**
```json
{
  "ngay": "1.7",
  "ca1": 3000000,
  "ca2": 2000000,
  "ca3": 1500000,
  "ca4": 500000,
  "ck": 800000,
  "tra_them": 0
}
```

### DELETE `/api/records/<month>/<type>/<ngay>`
Xóa 1 dòng dữ liệu.

- `type`: `nha_hang` hoặc `thuoc`
- `ngay`: vd `1.7`

---

## 📊 Summary

### GET `/api/summary/<YYYY-MM>`
KPI tóm tắt tháng.

**Response:**
```json
{
  "month": "2025-07",
  "nha_hang": {
    "tong_thang": 450000000,
    "tb_ngay": 15000000,
    "max_ngay": 25000000,
    "so_ngay": 30
  },
  "thuoc": {
    "tong_thang": 200000000,
    "tb_ngay": 7000000,
    "max_ngay": 12000000,
    "so_ngay": 28
  }
}
```

### GET `/api/months`
Danh sách tháng đã có dữ liệu, mới nhất trước.

**Response:** `["2025-07", "2025-06", "2025-05"]`

### GET `/api/report`
Dữ liệu 6 tháng gần nhất (dùng cho trang báo cáo Chart.js).

---

## ⬇️ Export

### GET `/api/export/<YYYY-MM>`
Download file Excel tháng đó (`doanhthu_YYYY-MM.xlsx`).  
Gồm 2 sheets: **Nhà Hàng** và **Thuốc**.
