# CT/Capacity Gate

## Hard Checks
- [ ] 动作级CT而非粗表
- [ ] 并行/顺序/瓶颈正确
- [ ] 视觉内部耗时拆分
- [ ] Machine CT/UPH/裕量闭环
- [ ] 带宽/存储估算一致
- [ ] 没有虚假精确
## Gate通用规则
- Critical hard condition任一失败 => REWORK；
- 评分不能覆盖硬条件；
- 不允许用户代替Gatekeeper审查；
- FAIL必须给可执行返工单；
- PASS才允许PEM冻结本阶段事实。
