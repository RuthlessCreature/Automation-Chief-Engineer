# BOM/Manufacturing/Cost Gate

## Hard Checks
- [ ] 采购级BOM型号级
- [ ] 关键件有推荐+备选+最低规格
- [ ] 非标件有材料/工艺/公差/表面
- [ ] DFM/DFA已执行
- [ ] 成本/交期/供应风险显式
- [ ] Assembly/BOM数量一致
## Gate通用规则
- Critical hard condition任一失败 => REWORK；
- 评分不能覆盖硬条件；
- 不允许用户代替Gatekeeper审查；
- FAIL必须给可执行返工单；
- PASS才允许PEM冻结本阶段事实。
