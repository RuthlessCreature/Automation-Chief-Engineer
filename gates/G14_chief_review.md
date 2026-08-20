# Chief Integration Gate

## Hard Checks
- [ ] REQ→FAI→Station→Hardware→Algorithm→CT→BOM→Test闭环
- [ ] CAD/Assembly/BOM/Render/Office一致
- [ ] Station/Camera/Robot数量一致
- [ ] 销售/验收与工程一致
- [ ] 所有重大Finding已返工关闭或透明Open
## Gate通用规则
- Critical hard condition任一失败 => REWORK；
- 评分不能覆盖硬条件；
- 不允许用户代替Gatekeeper审查；
- FAIL必须给可执行返工单；
- PASS才允许PEM冻结本阶段事实。
