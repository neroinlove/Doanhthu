# Dashboard Doanh Thu

Web dashboard nhập và theo dõi doanh thu quầy thuốc theo ngày/tháng.

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
| POST | `/api/records/YYYY-MM/quay_thuoc` | Lưu doanh thu một ngày |
| GET | `/api/export/YYYY-MM` | Download Excel |

## Làm việc trên hai máy với Git

Repository: `https://github.com/neroinlove/Doanhthu.git`

Trước khi bắt đầu làm việc trên mỗi máy:

```bash
git pull --rebase origin main
```

Sau khi hoàn thành và kiểm tra thay đổi:

```bash
git add .
git commit -m "Mô tả thay đổi"
git push origin main
```

Không chỉnh cùng một file dữ liệu tháng trên hai máy trước khi pull, vì mỗi tháng hiện được lưu trong một file JSON duy nhất.

## Deploy

Xem `docs/api/endpoints.md` và [CHANGELOG.md](CHANGELOG.md) để biết chi tiết.

**Tùy chọn deploy:**
- Cloudflare Tunnel (miễn phí, dùng ngay)
- Railway/Render (push GitHub → live)
- VPS + domain riêng (bền nhất)
