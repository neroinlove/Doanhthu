# Changelog — Dashboard Doanh Thu

## [2026-07-13]

### Added
- Web dashboard Flask hoàn chỉnh tại `localhost:5001`
- Tab switching: 🏠 Nhà Hàng / 💊 Thuốc
- 3 KPI cards: Tổng tháng NH, Tổng tháng Thuốc, Tổng chung
- Day pill selector — click chọn ngày, tự load dữ liệu vào form
- Live preview Tổng khi nhập số (realtime)
- Bảng tổng hợp tháng với hàng TỔNG tự động
- Nút sửa ✏️ / xóa 🗑️ từng dòng
- Modal xác nhận xóa
- Trang báo cáo `/report` với Chart.js:
  - Bar chart doanh thu NH/Thuốc theo ngày
  - Stacked bar chart so sánh 6 tháng gần nhất
  - Doughnut chart phân tích 3 kênh CK
  - Quick stats: ngày cao nhất, tiền trả hàng, % nhập liệu
- Export Excel (openpyxl)
- JSON file storage `data/records/YYYY-MM.json`
- CLI script `nhap_doanh_so.py` (backup plan, không dùng chính)

### Changed
- Cấu trúc cột Nhà Hàng mới (theo yêu cầu user):
  - Bỏ cột Trưa
  - Tách CK → 3 cột: CK chính / CK thuốc / CK dụng cụ
  - Bỏ: Tiền mặt, Tiền thực tế, Tiền trên app, Dư thiếu
  - Thêm: Tiền trả hàng

### Decision
- Tổng = Sáng + Tối + CK + CK Thuốc + CK Dụng cụ
  (Tiền trả hàng KHÔNG tính vào Tổng — đây là chi phí)
