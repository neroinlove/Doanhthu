# Dashboard Doanh Thu

Web dashboard nhập và theo dõi doanh thu nhà hàng + thuốc theo ngày/tháng.

## Cài đặt

```bash
cd f:\Project\Doanhthu
pip install -r requirements.txt
python app.py
# → Mở http://localhost:5001
```

## Cấu trúc

```
Doanhthu/
├── app.py                  # Flask backend (port 5001)
├── requirements.txt        # flask, openpyxl
├── data/records/           # Dữ liệu JSON theo tháng (YYYY-MM.json)
├── templates/
│   ├── dashboard.html      # Trang nhập liệu
│   └── report.html         # Trang báo cáo biểu đồ
├── static/
│   ├── css/style.css       # Dark mode premium
│   └── js/app.js           # Frontend logic
├── docs/api/endpoints.md   # API documentation
├── CHANGELOG.md
└── .brain/                 # AWF brain files (đừng xóa)
    ├── brain.json
    └── session.json
```

## API nhanh

| Method | URL | Chức năng |
|--------|-----|-----------|
| GET | `/api/records/YYYY-MM` | Lấy data tháng |
| POST | `/api/records/YYYY-MM/nha_hang` | Lưu ngày NH |
| POST | `/api/records/YYYY-MM/thuoc` | Lưu ngày Thuốc |
| GET | `/api/export/YYYY-MM` | Download Excel |

## Deploy

Xem `docs/api/endpoints.md` và [CHANGELOG.md](CHANGELOG.md) để biết chi tiết.

**Tùy chọn deploy:**
- Cloudflare Tunnel (miễn phí, dùng ngay)
- Railway/Render (push GitHub → live)
- VPS + domain riêng (bền nhất)
