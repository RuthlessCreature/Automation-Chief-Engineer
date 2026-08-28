# Office Gate

## Hard Checks
- [ ] Word/PPT/Excel可直接被目标角色使用
- [ ] 核心参数跨Office一致
- [ ] 图片不是附件躺尸
- [ ] Visual Utilization达到阈值
- [ ] 字体/乱码/版式通过
- [ ] 无Prompt/JSON/Debug污染
- [ ] 若 `Delivery Contract=R2-F10-GOLDEN-121`：DOCX至少33个标题级章节，包含15个核心工程章节与16页视觉证据附录
- [ ] 若 `Delivery Contract=R2-F10-GOLDEN-121`：PPTX恰31页，页序和工程覆盖符合合同
- [ ] 若 `Delivery Contract=R2-F10-GOLDEN-121`：XLSX恰21个固定Sheet，必需计算Sheet满足公式最低数
- [ ] 若 `Delivery Contract=R2-F10-GOLDEN-121`：Visual Map逐项映射合同要求的106张PNG视觉资产，不存在重复/凑数图
## Gate通用规则
- Critical hard condition任一失败 => REWORK；
- 评分不能覆盖硬条件；
- 不允许用户代替Gatekeeper审查；
- FAIL必须给可执行返工单；
- PASS才允许PEM冻结本阶段事实。
