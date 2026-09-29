<!-- nero-dev-workflow:start -->
## Nhánh làm việc

`main` luôn bằng thứ đang chạy production và là nơi duy nhất để deploy.

Mỗi task một nhánh ngắn ngày cắt từ `main` mới nhất: `feat/`, `fix/`, `chore/`
hoặc `docs/`. Không nhánh dài hạn theo module, không cắt nhánh từ nhánh task
khác. Nhánh sống quá 7 ngày thì merge `main` vào, hoặc tách nhỏ task.

Trước khi xin merge: kiểm thử/typecheck sạch, tài liệu trạng thái dùng chung đã
đúng, acceptance đã có evidence. Merge xong thì xoá nhánh.

## Phê duyệt

Dừng và chờ user duyệt trước khi: **merge** · **deploy production** ·
**thao tác dữ liệu phá huỷ** · **schema migration** · **đổi auth/permission
hoặc breaking API**.

Hook `approval-gate.sh` chặn các lệnh này ở PreToolUse. Hook là lưới an toàn,
không phải giấy phép: đừng tìm đường lách nó.

## Điều phối nhiều agent

Cần chạy worker có giám sát, task DAG, decision gate hay ask/reply → dùng skill
`orchestration` của Orca (`orca skills get orchestration`). Không tự dựng cơ chế
điều phối riêng, không thay bằng subagent ngoài Orca.

Khi prompt của user có chứa `@claude`, `@codex` hoặc `@opencode` chỉ định agent khác:
- DỪNG NGAY, KHÔNG tự ý trả lời hoặc thực hiện thay.
- Giám sát trọn gói (Supervised loop) qua Orca theo đúng 3 bước:
  1. Khởi tạo Run: `orca orchestration run-create --objective "<mô tả ngắn gọn mục tiêu>" --json`
  2. Giao việc cho worker: `orca orchestration worker-start --spec "<nội dung việc cần làm>" --worktree current --agent <tên_agent> --json` (`@claude` → `claude`, `@codex` → `codex`, `@opencode` → `opencode`).
  3. Đứng chờ kết quả: `orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json` (lệnh chờ ở cấp OS, hoàn toàn không tốn token của model).
- Khi nhận được tín hiệu `worker_done`, đọc outcome và tổng hợp báo cáo nghiệm thu rõ ràng cho user bằng tiếng Việt trước khi kết thúc turn.
- Quy tắc "task đơn lẻ làm thẳng" CHỈ áp dụng khi KHÔNG có @-mention chỉ định agent khác (hoặc khi @-mention trúng chính mình).
- `@opencode` chạy model qua dịch vụ bên ngoài (HilluAI): mọi thứ nó đọc đều rời
  khỏi máy. Không giao cho nó việc chạm mật khẩu, Keychain, API key, token,
  SSH/GPG key, `.env`, file credential, đăng nhập CLI, `sudo` hay cấu hình bảo mật
  macOS; spec giao việc không được chứa secret. Phần đó coordinator tự làm cùng
  user. Plugin `nero-security-guard.js` chặn cứng các thao tác này trong opencode;
  worker báo bị chặn thì không giao lại bằng cách diễn đạt khác.
<!-- nero-dev-workflow:end -->
