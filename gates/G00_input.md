# Input Gate

## Hard Checks
- [ ] 全部相关输入已发现并读取/标记不可读
- [ ] Input Manifest完整
- [ ] CAD/图纸优先级正确
- [ ] 关键缺失项与Decision Blocker已识别
- [ ] 未提前写方案/Office
- [ ] 若任务为完整项目：`DELIVERY_CONTRACT=R2-F10-GOLDEN-121` 已写入 PEM，121 个交付槽位及 UserOnly 偏离权限已冻结
## Gate通用规则
- Critical hard condition任一失败 => REWORK；
- 评分不能覆盖硬条件；
- 不允许用户代替Gatekeeper审查；
- FAIL必须给可执行返工单；
- PASS才允许PEM冻结本阶段事实。
