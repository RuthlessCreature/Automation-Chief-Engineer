# Deliverable Manifest Schema

```text
File ID
File Name
Relative Path
Version
Description
Owner Module
Controlled Baseline Revision / Source PEM Revision
Status: GENERATED | VALIDATED | PARTIAL | NOT GENERATED | PLANNED TEST
Validation Result
Size
SHA256
Customer/Internal
Delivery Contract Profile
Expected Slot / Actual Slot
Content Coverage Check
```

当 `Delivery Contract Profile=R2-F10-GOLDEN-121` 时，CSV/JSON 清单必须恰有 119 个客户载荷记录；两个 Manifest 文件自身不加入客户载荷哈希范围。`Manifest_Checks` 必须记录 ZIP 文件总数、载荷总数、Office/CAD/视觉分层、公式/页数/Sheet 数、哈希与校验器结果。
