# Software/MES Gate

## Hard Checks
- [ ] PLC状态机有Entry/Action/Exit/Timeout/Recovery
- [ ] Handshake完整
- [ ] Recipe/HMI/Alarm明确
- [ ] MES/Traceability字段完整
- [ ] 离线/异常恢复考虑
## Gate通用规则
- Critical hard condition任一失败 => REWORK；
- 评分不能覆盖硬条件；
- 不允许用户代替Gatekeeper审查；
- FAIL必须给可执行返工单；
- PASS才允许PEM冻结本阶段事实。
