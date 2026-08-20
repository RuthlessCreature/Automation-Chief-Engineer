# Validation Gate

## Hard Checks
- [ ] 每关键Requirement映射Test
- [ ] FAT/SAT/MSA/GRR未实测不写PASS
- [ ] Risk高项有Mitigation
- [ ] POC可执行且有Pass Criteria
- [ ] 验收标准可现场使用
## Gate通用规则
- Critical hard condition任一失败 => REWORK；
- 评分不能覆盖硬条件；
- 不允许用户代替Gatekeeper审查；
- FAIL必须给可执行返工单；
- PASS才允许PEM冻结本阶段事实。
