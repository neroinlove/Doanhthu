# Workflow Bundle

Đây là folder bundle dùng để copy sang project khác.

Nó đã gộp sẵn:

- `awf-main/` - quy trình AWF đầy đủ
- `.agents/` - quy tắc vận hành, playbook, lessons, skill nội bộ

## Cách dùng

1. Copy nguyên folder `workflow_bundle/` sang project mới.
2. Đọc theo thứ tự:
   - `awf-main/PORTABLE.md`
   - `awf-main/README.md`
   - `.agents/AG_DECISION_RULES.md`
   - `.agents/dec-debug-playbook.md`
   - `.agents/skills/my-skills/SKILL.md`
3. Tạo hoặc cập nhật `.brain/` của project mới.
4. Bắt đầu bằng:
   - `/init` nếu là project mới
   - `/recap` nếu là project cũ

## Ý nghĩa

Bundle này được thiết kế để AI có thể nhanh chóng hiểu:

- dự án đang làm gì
- cần làm theo workflow nào
- cách lưu trí nhớ dự án
- cách xử lý bug, plan, code, test, deploy
- cách làm việc theo quy tắc riêng của `.agents`

## Lưu ý

- Nếu sang project mới hoàn toàn, nên cập nhật lại `.agents/AG_LESSONS.jsonl` cho đúng bối cảnh mới.
- Nếu project có quy tắc riêng, ưu tiên ghi vào `.brain/preferences.json` và `docs/`.

## Cấu trúc

```text
workflow_bundle/
├── README.md
├── awf-main/
└── .agents/
```
