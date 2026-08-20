# Electrical Gate

## Hard Checks
- [ ] 电源/24V/IO/网络/柜体/安全闭环
- [ ] IO余量合理
- [ ] E-stop/门/STO等安全链明确
- [ ] 设备/视觉/机器人接口明确
- [ ] Alarm/Recovery覆盖主要故障
## Gate通用规则
- Critical hard condition任一失败 => REWORK；
- 评分不能覆盖硬条件；
- 不允许用户代替Gatekeeper审查；
- FAIL必须给可执行返工单；
- PASS才允许PEM冻结本阶段事实。
