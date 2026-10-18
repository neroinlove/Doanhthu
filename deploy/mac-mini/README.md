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

## Chuyển service về project chính

Thư mục chính: `/Users/longpham/Desktop/ProjectCode/doanhthu`. File
`com.neroinlove.doanhthu.plist` đã chuẩn bị đường dẫn Python và
`WorkingDirectory` về thư mục này. Bản cài trong `~/Library/LaunchAgents/`
chỉ thay sau khi user duyệt triển khai và đồng bộ dữ liệu. User đã duyệt
merge cấu hình; việc triển khai và đồng bộ dữ liệu vẫn chờ phê duyệt riêng.

Kiểm tra ngày 18/10/2026: service còn chạy tại
`~/.gemini/antigravity/scratch/doanhthu`; mã ứng dụng, template, static và
nguồn OCR giống project chính. Dữ liệu tháng 01–06 giống nhau, tháng 07
ở project chính đã cũ, tháng 08–10 chỉ có trong scratch.

Kiểm tra trước triển khai đã đạt: `plutil -lint`, `git diff --check`,
Python và dependency tải từ `.venv` của project chính. Flask test client
đã trả HTTP 200 cho 25 GET (dashboard, báo cáo, health, danh sách tháng,
API báo cáo, records và summary của 10 tháng) khi đọc bộ dữ liệu scratch;
checksum nguồn không đổi. Chưa thay LaunchAgent đang cài hoặc dữ liệu thật.

Trình tự sau khi được duyệt:

1. Merge nhánh sửa cấu hình vào `main`; chỉ triển khai từ `main`.
2. Dừng LaunchAgent để không phát sinh ghi dữ liệu trong lúc sao chép.
3. Sao lưu plist đang cài và toàn bộ `data/records/` của cả hai thư mục
   ra ngoài repo. Giữ nguyên bản scratch để có thể quay lại.
4. Đối chiếu lại file tại thời điểm chuyển, đồng bộ JSON từ scratch về
   project chính; không xóa file riêng của project chính. Nếu xuất hiện
   khác biệt ngoài phạm vi đã duyệt, dừng để kiểm tra.
5. Kiểm tra checksum dữ liệu, rồi cài plist mới và nạp lại LaunchAgent.
6. Xác minh `launchctl print` và cwd tiến trình trỏ về project chính,
   `/health` trả `data_dir` tại project chính; kiểm tra dashboard,
   báo cáo và API đọc dữ liệu. Giữ IP/cổng `192.168.1.88:5501`, một worker.

Nếu service mới không khởi động, khôi phục plist đã sao lưu và chạy lại
service scratch. Nếu service mới đã nhận dữ liệu nhập, phải đối chiếu và
bảo toàn dữ liệu mới trước khi quay lại.

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
