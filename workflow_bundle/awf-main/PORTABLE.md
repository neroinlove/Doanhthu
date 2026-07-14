# AWF Portable Pack

Đây là bản đóng gói gọn của AWF để có thể copy nguyên folder `awf-main` sang bất kỳ project nào.

Mục tiêu:

- dùng được ngay cho project mới
- giúp AI hiểu cách làm việc của dự án chỉ bằng cách đọc folder này
- giữ quy trình rõ ràng: `init -> plan -> design -> visualize -> code -> run -> test -> debug -> deploy -> save-brain`
- lưu được ngữ cảnh để quay lại sau mà không phải đoán lại từ đầu

## Cách dùng nhanh

1. Copy folder `awf-main` vào thư mục dự án.
2. Đảm bảo project có thư mục `.brain/`.
3. Khi bắt đầu làm việc, dùng luồng phù hợp:
   - `/init` nếu chưa có gì
   - `/recap` nếu quay lại dự án cũ
   - `/plan` nếu đã rõ ý tưởng
   - `/design` nếu cần chốt DB/API/luồng
   - `/visualize` nếu cần chốt UI trước
   - `/code` để bắt đầu triển khai
4. Cuối buổi hoặc sau milestone lớn, chạy `/save-brain`.

## Quy ước cốt lõi

- AI đề xuất trước, user duyệt sau ở các bước lớn.
- Code phải đi cùng test và xác nhận kết quả.
- Không tự ý deploy/push khi chưa được yêu cầu.
- Không sửa lan ngoài phạm vi nếu không có lý do rõ ràng.
- Mọi thay đổi lớn nên cập nhật docs, changelog và brain.

## Bộ file nhớ trạng thái

### `.brain/brain.json`
Kiến thức tĩnh của dự án:

- dự án làm gì
- tech stack
- cấu trúc dữ liệu
- API quan trọng
- business rules
- gotchas và conventions

### `.brain/session.json`
Trạng thái động:

- đang làm gì
- phase hiện tại
- file đang sửa
- việc còn lại
- quyết định gần đây
- lỗi đã gặp

### `.brain/preferences.json`
Sở thích làm việc của user:

- cách giao tiếp
- mức kỹ thuật
- mức tự quyết
- chất lượng đầu ra
- tốc độ làm việc

### `.brain/handover.md`
File bàn giao ngắn khi context dài hoặc chuẩn bị ngắt phiên.

### `.brain/session_log.txt`
Log append-only cho tiến trình nhỏ, nhẹ, rẻ token.

## Thứ tự làm việc khuyến nghị

### Dự án mới

1. `/init`
2. `/brainstorm` nếu ý tưởng chưa rõ
3. `/plan`
4. `/design`
5. `/visualize`
6. `/code`
7. `/run`
8. `/test`
9. `/deploy`
10. `/save-brain`

### Quay lại dự án cũ

1. `/recap`
2. `/next`
3. `/code` hoặc `/debug`
4. `/test`
5. `/save-brain`

### Khi có lỗi

1. `/debug`
2. `/test`
3. `/rollback` nếu sửa hỏng rộng

## Khi nào dùng từng workflow

### `/init`
Dùng khi bắt đầu dự án mới. Chỉ tạo khung tối thiểu, chưa cài packages, chưa thiết kế sâu.

### `/plan`
Dùng khi đã có ý tưởng và cần chia features, phases, ưu tiên, phạm vi.

### `/design`
Dùng khi cần chốt DB, API, luồng nghiệp vụ, hidden requirements.

### `/visualize`
Dùng khi cần chốt giao diện, layout, responsive, trạng thái UI.

### `/code`
Dùng để triển khai thực tế theo phase hoặc theo task.

### `/run`
Dùng để chạy app và xác minh nó lên được.

### `/test`
Dùng để kiểm tra phần vừa sửa hoặc bộ test liên quan.

### `/debug`
Dùng khi có lỗi, không rõ nguyên nhân, hoặc test fail.

### `/deploy`
Dùng khi đưa app lên production hoặc môi trường thật.

### `/recap`
Dùng khi quay lại sau một thời gian để nhớ lại đang làm gì.

### `/save-brain`
Dùng để lưu tri thức dự án, trạng thái phiên và quy ước quan trọng.

### `/customize`
Dùng để cá nhân hóa cách AI nói chuyện và làm việc.

### `/awf-update`
Dùng để cập nhật bộ AWF nếu có bản mới.

## Bộ nhớ tối thiểu nên có cho mỗi project

Nên tạo ít nhất:

- `README.md`
- `docs/`
- `docs/api/`
- `docs/specs/`
- `.brain/brain.json`
- `.brain/session.json`
- `.brain/preferences.json`

## Các tài liệu nên viết thêm khi project lớn hơn

- `docs/architecture/system_overview.md`
- `docs/database/schema.md`
- `docs/business/rules.md`
- `docs/api/endpoints.md`
- `CHANGELOG.md`
- `docs/specs/<feature>_spec.md`

## Cách đọc một project mới

Khi copy AWF sang project khác, AI nên ưu tiên đọc:

1. `awf-main/PORTABLE.md`
2. `awf-main/README.md`
3. `awf-main/workflows/README.md`
4. `.brain/brain.json`
5. `.brain/session.json`
6. `docs/specs/`
7. `docs/api/`

## Điều không nên làm

- Không tự ý cài thêm công cụ ngoài phạm vi yêu cầu.
- Không tự ý deploy/push.
- Không sửa hàng loạt nếu chưa hiểu rõ.
- Không bỏ qua `/save-brain` sau những thay đổi lớn.
- Không coi responsive CSS là đủ nếu user cần chế độ mobile rõ ràng.

## Cách dùng cho nhiều dự án

Mỗi project nên có:

- một `.brain/` riêng
- một `docs/` riêng
- một `CHANGELOG.md` riêng
- một bộ workflow AWF copy kèm theo

Như vậy, chỉ cần dán folder `awf-main` vào project là AI đã có:

- cách làm việc
- cách nhớ context
- cách lên plan
- cách code
- cách test
- cách deploy

Đây là “bộ xương sống” của AWF Portable Pack.
