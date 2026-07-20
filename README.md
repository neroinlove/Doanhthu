# Dashboard Doanh Thu

Web dashboard nhập và theo dõi doanh thu quầy thuốc theo ngày/tháng.

## Cài đặt

```bash
cd f:\Project\Doanhthu
pip install -r requirements.txt
python app.py
# → Mở http://192.168.1.88:5501
# hoặc:
# APP_HOST=192.168.1.88 APP_PORT=5501 APP_DEBUG=0 python app.py
```

## Cấu trúc

```
Doanhthu/
├── app.py                  # Flask backend (port 5501)
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

Mô hình khuyến nghị cho Mac mini M4:

`Cloudflare DNS -> Nginx Proxy Manager -> Mac mini (Flask/Gunicorn) -> data/records/*.json`

Gợi ý cấu hình:

- Subdomain: `doanhthu.neroinlove.com`
- Proxy ở Nginx Proxy Manager trỏ vào Mac mini trong LAN
- SSL: Let’s Encrypt ở NPM
- App chạy với `APP_DEBUG=0`
- Nên để service tự khởi động cùng máy

Kiểm tra sức khỏe:

- `GET /health`
- Dùng để kiểm tra app còn sống trước khi NPM forward traffic

Tài liệu triển khai Mac mini:

- [deploy/mac-mini/README.md](deploy/mac-mini/README.md)
- [deploy/mac-mini/doanhthu.env.example](deploy/mac-mini/doanhthu.env.example)
- [deploy/mac-mini/com.neroinlove.doanhthu.plist.template](deploy/mac-mini/com.neroinlove.doanhthu.plist.template)

Xem `docs/api/endpoints.md` và [CHANGELOG.md](CHANGELOG.md) để biết chi tiết.
