# QA Test Matrix — 2026-09-20

这是 Codex 接手生产 QA 的**详细测试矩阵源文件**。完整矩阵共 **172 条**，为了让 GitHub diff / code search / Codex 按模块读取更稳定，拆为 4 个 CSV 分片：

1. `part-01-auth-nav-task-input.csv`
   - AUTH-001 ~ AUTH-010
   - NAV-001 ~ NAV-010
   - TASK-001 ~ TASK-016
   - UP-001 ~ UP-008

2. `part-02-pipeline-cad-preview.csv`
   - UP-009 ~ UP-014
   - PIPE-001 ~ PIPE-020
   - CAD-001 ~ CAD-010
   - PRE-001 ~ PRE-009

3. `part-03-delivery-rework-security.csv`
   - PRE-010
   - DEL-001 ~ DEL-018
   - RW-001 ~ RW-008
   - ADM-001 ~ ADM-006
   - SEC-001 ~ SEC-012

4. `part-04-ux-ops-release-history.csv`
   - SEC-013 ~ SEC-014
   - UX-001 ~ UX-010
   - OPS-001 ~ OPS-008
   - REL-001 ~ REL-008
   - HIST-001 ~ HIST-010

## 字段

每条用例固定包含：

- 用例ID
- 模块 / 子模块
- 优先级 P0/P1/P2/P3
- 测试类型
- 前置条件
- 测试数据
- **逐步操作步骤**
- **明确预期结果**
- **明确失败判定**
- 证据要求
- 自动化建议
- 是否修改生产
- 基线状态
- 关联 Bug / 修复
- 备注

## 基线状态枚举

- `HISTORICAL_PASS`：已有历史可复查证据，但 Codex 仍可按风险决定复跑；
- `FIXED_RETEST_PASS`：缺陷已经修复并完成过生产复验；
- `FIXED_RETEST_REQUIRED`：代码已修复和部署，但必须由 Codex 做新一轮真实浏览器/故障注入复测；
- `NOT_RUN`：尚未执行，不能默认通过。

## 数量

生成 Excel 时统计：

- Total: 172
- P0: 111
- P1: 43
- P2: 16
- P3: 2
- HISTORICAL_PASS: 54
- FIXED_RETEST_PASS: 7
- FIXED_RETEST_REQUIRED: 11
- NOT_RUN: 100

## P0 首轮必须优先执行

先做不破坏生产的 P0：

- AUTH-001/002/004/005/007/010
- NAV-001/002/004/007
- DEL-002/003/004/005/006/013/016/017
- UX-001/002/003/004/005
- REL-001/003/004/005/008
- HIST-001/002/003

然后再执行受控生产修改：

- TASK-002/004/007/008
- UP-007/008/009/010/013/014
- PIPE-001~019
- CAD-001~005
- RW-004/005/008
- ADM-003/004
- OPS-002/005/008

## 执行原则

1. FAIL 必须有可复查证据，不能凭主观判断。
2. FAIL → regression test → 最小修复 → CI → PR merge → production deploy → **原用例复测 + 邻接用例回归**。
3. P0/P1 未闭环时不得宣布“测试完成”。
4. 结构 validator PASS 不等价于工程内容质量 PASS；HIST-004~010 必须人工审查。
5. 不允许为了过测试而放宽 Gate / validator / 权限隔离。
6. 密码、API key、session、signed URL 不得进入 CSV、截图或 Actions 日志。

## Excel

本次 handoff 同时生成了 `Automation-Chief-Engineer_QA_Test_Matrix_20260920.xlsx`，包含：

- 00_概览
- 01_测试用例
- 02_缺陷清单
- 03_生产基线
- 04_Codex执行顺序
- 05_退出标准
- 06_分支处置

Excel 是执行工作簿；仓库内这 4 个 CSV 是可 code-search、可 diff 的 canonical 文本镜像。
