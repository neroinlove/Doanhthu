# Mac mini M4 Deployment

Mục tiêu:

- chạy app như service trên macOS
- tự khởi động khi máy lên
- app chỉ nghe trên IP LAN `192.168.1.88`
- Nginx Proxy Manager bên ngoài sẽ proxy vào Mac mini
- Cloudflare chỉ làm DNS

## Khuyến nghị kiến trúc

`Cloudflare DNS -> Nginx Proxy Manager -> Mac mini (gunicorn) -> Flask app`

## Cách chạy

### 1) Tạo virtualenv

```bash
cd /path/to/Doanhthu
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

### 2) Tạo file env

Copy `doanhthu.env.example` thành `doanhthu.env` và sửa các giá trị phù hợp.

### 3) Chạy thử bằng gunicorn

```bash
source .venv/bin/activate
export $(grep -v '^#' deploy/mac-mini/doanhthu.env | xargs)
gunicorn --workers 1 --bind 192.168.1.88:5501 app:app
```

Lưu ý:

- chỉ dùng `1 worker` vì dữ liệu đang lưu JSON theo tháng
- app public nên đi qua Nginx Proxy Manager, không mở thẳng port ra ngoài

### 4) Kiểm tra sống

```bash
curl http://192.168.1.88:5501/health
```

## launchd

File template:

- `com.neroinlove.doanhthu.plist.template`

Các placeholder cần thay:

- `__USER__`
- `__PROJECT_DIR__`
- `__VENV_PYTHON__`
- `__ENV_FILE__`

## Nginx Proxy Manager

Tạo Proxy Host:

- Domain: `doanhthu.neroinlove.com`
- Forward Hostname/IP: `192.168.1.88`
- Forward Port: `5501`
- Scheme: `http`
- SSL: Let’s Encrypt
- Access: Public hoặc thêm Access List nếu muốn khóa thêm

## Cloudflare DNS

Trong Cloudflare:

- tạo `A` record `doanhthu` nếu cần
- nếu đang dùng NPM ở ngoài internet thì trỏ domain/subdomain về IP public của router/VPS
- nếu chỉ dùng nội bộ qua reverse proxy thì giữ theo mô hình hiện tại của anh

## Ghi chú quan trọng

- Không dùng nhiều worker khi vẫn lưu JSON file.
- Nếu sau này đổi sang SQLite thì mới cân nhắc tăng worker.
- Nên backup `data/records/` định kỳ.
