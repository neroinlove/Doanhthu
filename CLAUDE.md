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

Lời duyệt chỉ do user tự gõ. Agent không tự viết, không chuyển tiếp câu
`Duyệt chạy …` vào terminal của agent khác; worker bị gate chặn thì escalate
về coordinator.

## Trình duyệt khi test

Chỉ test bằng Chromium của Playwright, chạy headless, profile tạm. Không mở
Google Chrome của user, không dùng plugin Chrome để test.

Ai mở trình duyệt thì người đó đóng: đóng trong `finally`/teardown kể cả khi
test lỗi, và kiểm không còn tiến trình mình mở trước khi báo xong hoặc gửi
`worker_done`. Tác vụ `browser-reaper` tắt Chromium Playwright sống quá 1 tiếng
chỉ là lưới an toàn, không thay cho việc tự đóng.

## Báo cáo cho user

Xong mỗi việc, cuối phiên, hoặc khi user hỏi tình hình thì báo đúng 3 mục,
dạng bảng hoặc gạch đầu dòng ngắn, chỉ ý chính:

1. **Đã làm:** việc gì, kết quả, bằng chứng (lệnh kiểm nào đạt).
2. **Tồn đọng / phát sinh:** việc dở, lỗi còn lại, vấn đề mới phát sinh và
   nằm ở đâu (project, file). Không có thì ghi "Không".
3. **Bước tiếp theo:** đánh số từ ưu tiên cao xuống thấp. Việc cần user
   duyệt hoặc quyết thì ghi rõ "Chờ bạn" kèm phương án đề xuất.

Không giải thích cơ chế, không nhắc lại điều đã nói, trừ khi user hỏi. Chi
tiết dài để trong file, chỉ ghi đường dẫn. Worker Orca báo cho coordinator
theo mẫu của đề bài, không theo mục này.

## Điều phối nhiều agent

Sếp là **Claude ở phiên chat chính với user**. User giao việc phát triển → dùng
skill `nero-boss`: hỏi đầu vào dự án, chia cỡ việc, chọn thợ, cho người khác
hãng chấm, nghiệm thu. Phiên có preamble Orca (Task/Dispatch ID) là **worker**:
chỉ làm đúng task đó, không giao việc tiếp. Codex, Antigravity, OpenCode khi
user chat trực tiếp thì làm thẳng việc được giao, không tự dựng phòng ban.

**Việc thiết kế UX/UI** (phác thảo, sửa giao diện, chọn phong cách) bắt buộc
nạp skill `nero-boss` trước, rồi giao Antigravity. Sếp không tự phác thảo hay
sửa UI, kể cả khi chỉ là ý tưởng để user duyệt.

Phiên sếp chạy Claude Opus và là **người điều phối duy nhất**: chỉ phiên này
giao thợ và release worker. Sếp tự lên kế hoạch việc Lớn và quyết định kiến
trúc; kế hoạch vẫn do user tự ký. Code sườn thì giao **worker Claude Opus**:
worker chỉ trả về code, không tự giao thợ.

Giao việc cho thợ luôn qua skill `orchestration` của Orca (`orca skills get
orchestration`). Không tự dựng cơ chế điều phối riêng. Subagent của Claude
không thay thợ: chỉ dùng `Explore` (tìm code, chỉ đọc) và `nero-checker` (chạy
lệnh kiểm, đọc log) để giữ context sếp gọn; sửa code và chấm bài vẫn qua Orca.

Khi prompt của user có chứa `@claude`, `@codex`, `@antigravity` hoặc `@opencode` chỉ định agent khác:
- DỪNG NGAY, KHÔNG tự ý trả lời hoặc thực hiện thay.
- Giám sát trọn gói (Supervised loop) qua Orca theo đúng 3 bước:
  1. Khởi tạo Run: `orca orchestration run-create --objective "<mô tả ngắn gọn mục tiêu>" --json`
  2. Giao việc cho worker: `orca orchestration worker-start --spec "<nội dung việc cần làm>" --worktree current --agent <tên_agent> --json` (`@claude` → `claude`, `@codex` → `codex`, `@antigravity` → `antigravity`, `@opencode` → `opencode`).
  3. Đứng chờ kết quả: `orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json` (lệnh chờ ở cấp OS, hoàn toàn không tốn token của model).
- Dòng nhắc `You have N orchestration message…` chỉ để đánh thức, không
  chứa nội dung. Phần lớn đến từ `heartbeat` của thợ. Gặp nó thì:
  1. Chạy một lệnh `orca orchestration check --json` lấy cả lô tin, xử lý
     hết. Lô chỉ có heartbeat thì không cần trả lời.
  2. Xem còn thợ chạy không: `orca orchestration worker-list --run <run_id> --terminal-state active --json`.
     Không còn thợ nào `outcome: in_progress` thì ack lô vừa xử lý
     (`check --ack <delivery_id> --json`) rồi kết thúc lượt, không chờ.
  3. Còn thợ chạy thì chờ tiếp bằng `orca orchestration check --ack <delivery_id> --wait --types "worker_done,escalation,question" --timeout-ms 900000 --json`:
     heartbeat không làm lệnh này dậy.
  Chỉ `--ack` lô đã đọc và xử lý xong; ack lô chưa đọc là bỏ sót tin.
  Nhiều dòng nhắc dồn lại thì một lần `check` là đủ; dòng sau mà `check`
  trả rỗng thì kết thúc lượt bằng một câu, không đọc lại file, không tóm tắt
  lại. Đang có `check --wait` chạy thì không `check` thêm.
- Khi nhận được tín hiệu `worker_done`, đọc outcome và tổng hợp báo cáo nghiệm thu rõ ràng cho user bằng tiếng Việt trước khi kết thúc turn.
- Sau khi xác thực `worker_done`, trước khi xác nhận đã xử lý xong delivery,
  coordinator phải chọn chủ sở hữu tiếp theo cho worker: chỉ tái sử dụng đúng
  terminal/agent khi có việc tiếp nối ngay trong cùng mạch và context hiện tại
  còn gọn, hữu ích (agent session `structworker_…` không tái dùng được); giữ
  worker khi bạn yêu cầu; còn lại mặc định gọi
  `orca orchestration worker-release --dispatch <dispatch_id> --json`. Áp dụng
  cho mọi agent, kể cả OpenCode/HilluAI. Nếu context gần giới hạn hoặc đã tích
  lũy nhiều nội dung không còn liên quan, hãy release và mở session mới khi cần.
  Không đặt ngưỡng token cố định vì giới hạn và cách tính khác nhau theo model,
  provider. `worker_done` không tự đóng session;
  `worker-release` đóng đúng terminal của dispatch đã settled. Không thay bằng
  `terminal close`.
- Không có @-mention (hoặc @-mention trúng chính mình): sếp tự chia cỡ theo `nero-boss`; việc Nhỏ thì làm thẳng.
- `@opencode` chạy model qua dịch vụ bên ngoài (HilluAI): mọi thứ nó đọc đều rời
  khỏi máy. Không giao cho nó việc chạm mật khẩu, Keychain, API key, token,
  SSH/GPG key, `.env`, file credential, đăng nhập CLI, `sudo` hay cấu hình bảo mật
  macOS, và không giao code bảo mật (auth, phân quyền, session, mã hoá); spec
  giao việc không được chứa secret. Phần đó coordinator tự làm cùng
  user. Plugin `nero-security-guard.js` chặn cứng các thao tác này trong opencode;
  worker báo bị chặn thì không giao lại bằng cách diễn đạt khác.
<!-- nero-dev-workflow:end -->
