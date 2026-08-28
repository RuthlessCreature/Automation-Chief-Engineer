# ZIP Delivery Gate

## Hard Checks
- [ ] ZIP存在且>0
- [ ] 可打开/解压
- [ ] 正式文件非零且可打开
- [ ] Manifest与实际文件一致
- [ ] 无假CAD/假PASS/Rejected Render
- [ ] 内部Prompt/Agent/Debug未进入客户ZIP
- [ ] 若 `Delivery Contract=R2-F10-GOLDEN-121`：ZIP恰121个文件、119个哈希客户载荷、6个固定一级目录
- [ ] 若 `Delivery Contract=R2-F10-GOLDEN-121`：`scripts/validate_r2_f10_golden_delivery.py <final.zip>` 返回PASS
- [ ] 若 `Delivery Contract=R2-F10-GOLDEN-121`：校验器报告已写入 Manifest_Checks，所有偏差已关闭
## Gate通用规则
- Critical hard condition任一失败 => REWORK；
- 评分不能覆盖硬条件；
- 不允许用户代替Gatekeeper审查；
- FAIL必须给可执行返工单；
- PASS才允许PEM冻结本阶段事实。
