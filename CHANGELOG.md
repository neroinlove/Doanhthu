# Changelog — Dashboard Doanh Thu

## [2026-07-13]

### Added
- Tính năng tự động thêm dấu chấm hàng nghìn và đuôi `.000` khi nhập tiền tệ để tăng tốc độ nhập liệu.
- Cơ chế lưu dữ liệu nháp tạm thời (Drafts) khi chuyển đổi qua lại giữa các ngày/tab mà chưa lưu.
- Hiển thị dấu chấm tròn màu vàng cam báo hiệu thay đổi chưa lưu trên nút chọn ngày.
- Tự động import dữ liệu 6 tháng đầu năm 2026 (từ tháng 01 đến tháng 06) từ file Excel cũ của quầy thuốc vào database JSON.
- Web dashboard Flask hoàn chỉnh tại `localhost:5001`.
- Day pill selector — click chọn ngày, tự load dữ liệu vào form.
- Live preview Tổng khi nhập số (realtime).
- Bảng tổng hợp tháng với hàng TỔNG tự động.
- Nút sửa ✏️ / xóa 🗑️ từng dòng.
- Modal xác nhận xóa.
- Trang báo cáo `/report` với Chart.js:
  - Bar chart doanh thu theo ngày.
  - Stacked bar chart so sánh 6 tháng gần nhất.
  - Doughnut chart phân tích 3 kênh CK.
  - Quick stats: ngày cao nhất, tiền trả hàng, % nhập liệu.
- Export Excel (openpyxl).
- JSON file storage `data/records/YYYY-MM.json`.
- CLI script `nhap_doanh_so.py` (backup plan, không dùng chính).

### Changed
- Giao diện Quầy Thuốc duy nhất: Ẩn thanh chuyển tab, ẩn tab Thuốc cũ (4 ca), đổi nhãn "Nhà Hàng" thành "Quầy Thuốc" để phù hợp 100% với thực tế kinh doanh của quầy thuốc.
- KPI tóm tắt rút gọn còn 2 thẻ: Tổng doanh thu thuốc tháng và Doanh thu trung bình ngày.
- Cấu trúc cột mới (theo yêu cầu user):
  - Bỏ cột Trưa.
  - Tách CK → 3 cột: CK chính / CK thuốc / CK dụng cụ.
  - Bỏ: Tiền mặt, Tiền thực tế, Tiền trên app, Dư thiếu.
  - Thêm: Tiền trả hàng.

### Decision
- Do dữ liệu quầy thuốc có các cột phân loại tiền CK thuốc/dụng cụ và ca Sáng/Tối khớp hoàn toàn với cấu trúc Nhà Hàng cũ, hệ thống sử dụng cấu trúc `nha_hang` trong DB để tương thích ngược nhưng hiển thị nhãn "Quầy Thuốc" trên giao diện.
- Tổng = Sáng + Tối + CK + CK Thuốc + CK Dụng cụ (Tiền trả hàng KHÔNG tính vào Tổng — đây là chi phí).
