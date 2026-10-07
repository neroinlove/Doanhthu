# AGENTS.md — Hợp đồng làm việc chung

> File này là luật chung cho mọi agent AI làm việc trên project: Claude, Codex, Antigravity.

Mọi phản hồi và tài liệu mới viết bằng **tiếng Việt**.

---

## 1. Bắt buộc đọc trước khi làm việc

1. `.brain/brain.json` và `.brain/session.json` (kiến trúc, tính năng, phiên làm việc).
2. `git status` và `git log -n 5`.

---

## 2. Phân vai agent

| Agent | Vai | Trách nhiệm chính |
|---|---|---|
| **Claude** | Planner | Nghiên cứu, phân tích nghiệp vụ, lập plan |
| **Codex** | Executor | Thực thi code chính xác theo plan đã duyệt |
| **Antigravity** | Auditor / Debugger | Audit, review, chẩn đoán bug, tuân thủ `.agents/AG_DECISION_RULES.md` |

---

## 3. Human Approval Gates bắt buộc

Phải dừng và chờ người dùng xác nhận trước khi:
1. Merge branch hoặc deploy production.
2. Thao tác xóa, ghi đè hoặc can thiệp phá hủy dữ liệu trong `data/records/`.
3. Thay đổi API breaking changes hoặc cấu trúc lưu trữ doanh thu.

---


<!-- nero-dev-workflow:start -->
## NERO workflow

### Nhánh làm việc

`main` luôn bằng thứ đang chạy production và là nơi duy nhất để deploy.

Mỗi task một nhánh ngắn ngày cắt từ `main` mới nhất: `feat/`, `fix/`, `chore/`
hoặc `docs/`. Không nhánh dài hạn theo module, không cắt nhánh từ nhánh task
khác. Nhánh sống quá 7 ngày thì merge `main` vào, hoặc tách nhỏ task.

Trước khi xin merge: kiểm thử/typecheck sạch, tài liệu trạng thái dùng chung đã
đúng, acceptance đã có evidence. Merge xong thì xoá nhánh.

### Phê duyệt

Dừng và chờ user duyệt trước khi: **merge** · **deploy production** ·
**thao tác dữ liệu phá huỷ** · **schema migration** · **đổi auth/permission
hoặc breaking API**.

Hook `approval-gate.sh` chặn các lệnh này ở PreToolUse. Hook là lưới an toàn,
không phải giấy phép: đừng tìm đường lách nó.

Lời duyệt chỉ do user tự gõ. Agent không tự viết, không chuyển tiếp câu
`Duyệt chạy …` vào terminal của agent khác; worker bị gate chặn thì escalate
về coordinator.

### Điều phối nhiều agent

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
- Sau khi xác thực `worker_done`, trước khi xác nhận đã xử lý xong delivery,
  coordinator phải chọn chủ sở hữu tiếp theo cho worker: chỉ tái sử dụng đúng
  terminal/agent khi có việc tiếp nối ngay trong cùng mạch và context hiện tại
  còn gọn, hữu ích; giữ worker chỉ khi bạn yêu cầu, hoặc mặc định gọi
  `orca orchestration worker-release --dispatch <dispatch_id> --json`. Áp dụng
  cho mọi agent, kể cả OpenCode/HilluAI. Nếu context gần giới hạn hoặc đã tích
  lũy nhiều nội dung không còn liên quan, hãy release và mở session mới khi cần.
  Không đặt ngưỡng token cố định vì giới hạn và cách tính khác nhau theo model,
  provider. `worker_done` không tự đóng session;
  `worker-release` đóng đúng terminal của dispatch đã settled. Không thay bằng
  `terminal close`.
- Quy tắc "task đơn lẻ làm thẳng" CHỈ áp dụng khi KHÔNG có @-mention chỉ định agent khác (hoặc khi @-mention trúng chính mình).
- `@opencode` chạy model qua dịch vụ bên ngoài (HilluAI): mọi thứ nó đọc đều rời
  khỏi máy. Không giao cho nó việc chạm mật khẩu, Keychain, API key, token,
  SSH/GPG key, `.env`, file credential, đăng nhập CLI, `sudo` hay cấu hình bảo mật
  macOS; spec giao việc không được chứa secret. Phần đó coordinator tự làm cùng
  user. Plugin `nero-security-guard.js` chặn cứng các thao tác này trong opencode;
  worker báo bị chặn thì không giao lại bằng cách diễn đạt khác.
<!-- nero-dev-workflow:end -->
