# Office Gate

## Hard Checks
- [ ] Word/PPT/Excel可直接被目标角色使用
- [ ] 核心参数跨Office一致
- [ ] 图片不是附件躺尸
- [ ] Visual Utilization达到阈值
- [ ] 字体/乱码/版式通过
- [ ] 无Prompt/JSON/Debug污染
## Gate通用规则
- Critical hard condition任一失败 => REWORK；
- 评分不能覆盖硬条件；
- 不允许用户代替Gatekeeper审查；
- FAIL必须给可执行返工单；
- PASS才允许PEM冻结本阶段事实。
