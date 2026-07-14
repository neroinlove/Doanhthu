# API Documentation - Dashboard Doanh Thu

Ngày cập nhật: 2026-07-14  
Base URL local: `http://localhost:5001`  
Base URL production: `https://doanhthu.neroinlove.com`

---

## Records

### GET `/api/records/<YYYY-MM>`
Lấy toàn bộ dữ liệu tháng.

### POST `/api/records/<YYYY-MM>/quay_thuoc`
Thêm hoặc cập nhật 1 ngày quầy thuốc.

### POST `/api/records/<YYYY-MM>/thuoc`
Thêm hoặc cập nhật 1 ngày thuốc.

### DELETE `/api/records/<month>/<type>/<ngay>`
Xóa 1 dòng dữ liệu.

---

## Summary

### GET `/api/summary/<YYYY-MM>`
KPI tóm tắt tháng.

### GET `/api/months`
Danh sách tháng đã có dữ liệu, mới nhất trước.

### GET `/api/report`
Dữ liệu 6 tháng gần nhất cho trang báo cáo Chart.js.

---

## Export

### GET `/api/export/<YYYY-MM>`
Download file Excel tháng đó (`doanhthu_YYYY-MM.xlsx`).
Gồm 2 sheets: **Quầy Thuốc** và **Thuốc**.

---

## Health check

### GET `/health`
Trả về trạng thái sống của app để proxy và service manager kiểm tra nhanh.

```json
{
  "status": "ok",
  "service": "doanhthu",
  "time": "2026-07-14T10:30:00",
  "data_dir": "F:/Project/Doanhthu/data/records"
}
```
