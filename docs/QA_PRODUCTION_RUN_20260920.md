# 生产质量保证运行记录 2026 09 20

## 运行结论

本轮生产修复已完成受控发布，并完成原失败交付场景的生产复测。Golden-121 交付门禁没有被降低，CAD、FAT、SAT、MSA/GR&R、供应商报价等无证据项没有被伪造。

本记录只登记已经取得证据的结果。`docs/qa-matrix/` 中没有取得本轮证据的用例不得推定为通过；在全部 172 条用例获得独立证据前，本记录不宣称矩阵整体完成。

## 版本和环境

| 项目 | 证据 |
| --- | --- |
| Git main | `fcefa1f1e1e6cc4f96c2ee1b8c7d4c123cae37a5` |
| 运行时代码修复 | `56fa3b8cc808e36be849175ed4b6ce660996c879` |
| Harness 修复 | `0d7ed689fd917e099cf6c6fe7b05b869f5d1016c` |
| 生产 Worker | `automation-chief-engineer-cloud` |
| 生产版本 | `70b0b1af-3d4c-4366-b78b-eeb2173109c7` |
| 生产域名 | `https://zg.gaona.world` |
| 发布方式 | `wrangler deploy --containers-rollout none` |
| CADCore 镜像 | 沿用已发布镜像，未在本轮替换 |
| CI | GitHub Actions run `35516952955`、`35517304023` 与 `35517891314` 均成功 |

## 首次生产失败

首次完整生产流程创建的 QA 任务为 `2e6eacf7-767a-47ae-9d19-ec3a4b466e11`。15 个阶段均已通过并生成 15 个阶段报告，但 G15 交付冻结被 Golden-121 validator 阻断，任务状态为 `QUALITY_BLOCKED`。

根因是 PPTX 固定评审页使用英文 `FAT/SAT/Acceptance 证据`，而权威 validator 要求中文工程术语 `验收`。MiniMax 本轮阶段报告未提供该词，因此交付被正确拒绝。这不是通过放宽 validator 解决的；修复是在受控 PPTX 生成器中固定写入合同术语，并增加稀疏提供方报告回归测试。

## 修复、CI 和发布

1. `56fa3b8` 将 PPTX 固定页改为 `FAT/SAT/验收证据`。
2. 新增回归测试，使用空阶段报告检查 Golden-121 所需的 18 个评审术语。
3. Windows 生产 QA harness 改为直接调用 Wrangler JavaScript 入口，并允许通过 `ACE_PYTHON` 指定实际 Python，避免 `npx` 参数拆分和 Windows Python alias 误用。
4. `npm test`：10 个测试文件、42 个测试通过。
5. `wrangler deploy --dry-run --containers-rollout none`：绑定和 Worker 上传检查通过。
6. 生产受控发布版本为 `79f217f7-5e83-4ecb-b92f-5d2fde18504d`。
7. 原失败场景复测通过后，修复提交推送到 main。

随后发现 Node Fetch 对中文 `X-Preview-Source` 自定义响应头给出兼容性警告。`fcefa1f` 将该机器可读 header 改为 ASCII 稳定标识，保留中文文件名在预览对象元数据和 UI 语义中；CI 成功后发布版本更新为 `70b0b1af-3d4c-4366-b78b-eeb2173109c7`，生产浏览器回归再次 4/4 通过。

## 原失败场景复测

复测创建的生产 QA 任务为 `1b7ed763-7ded-44e2-a3d7-25410b1088c1`。

| 检查项 | 结果 |
| --- | --- |
| 任务终态 | `PACKAGED` |
| quality status | `PASS` |
| accepted 阶段报告 | 15 |
| open workflow incidents | 0 |
| delivery status | `FROZEN` |
| ZIP 文件数 | 121 |
| 客户载荷数 | 119 |
| PPT 页数 | 31 |
| XLSX 工作表数 | 21 |
| 浏览器下载 SHA-256 | `4221fbd80bca146f6cdf746b3d6160438ea8c17b5b9406c88f1a4662cf3e161e` |
| Golden-121 validator | `PASS` |

权威校验输出为：`PASS [R2-F10-GOLDEN-121] 121 个 ZIP 文件、119 个客户载荷、31 页 PPT、21 张 Excel 工作表、DOCX 标题与 Manifest 均符合合同。`

## 生产浏览器回归

运行 `test/production-browser.spec.ts` 的 4 个生产用例，最终结果为 4/4 PASS：

- 任务选择、多选和 Inspector 切换保持响应；
- Customer Delivery 跨轮询周期保持稳定；
- 新建任务取消无副作用；
- 延迟任务响应不能覆盖后续选择。

该套回归曾出现两次 harness 误报：一次是延迟 route 在测试结束后继续执行，另一次是取消任务用例在任务列表首次填充前记录了 0 条基线。两次均建立了测试修复并复测通过，不改变生产业务门禁。

## 矩阵覆盖状态

Canonical 矩阵总数为 172 条，其中 P0 111 条、P1 43 条、P2 16 条、P3 2 条。本轮已取得证据的来源包括：

- 生产完整流程浏览器回归：认证、任务创建、15 阶段顺序、阶段单调性、唯一 `STAGE_GATED`、G15 冻结、Office 安全预览、ZIP 下载、无产品 CAD 事实边界、任务重命名/删除阻断、未登录下载隔离等场景；
- 生产命令中心浏览器回归：任务切换竞态、多选隔离、交付稳定性和取消无副作用；
- Vitest 单元与集成测试：质量策略、Harness、状态安全、权限隔离、MiniMax provider、交付资产和 Golden-121 生成器；
- TypeScript 类型检查、Wrangler 类型检查、Docker 容器绑定 dry-run（不含 CADCore 依赖联网安装）；
- 生产下载 ZIP 的独立 SHA-256 和权威 Python validator。

仍然没有独立生产证据的矩阵用例，特别是需要专用真实 CAD 输入、故障注入、低余额账号、管理员账号、浏览器设备矩阵或人工工程审查的用例，必须保持 `NOT_RUN` 或 `FIXED_RETEST_REQUIRED`，不能在发布报告中改写成 PASS。尤其是 HIST-004 至 HIST-010 的 Word、PPT、Excel、视觉资产、机械可制造性和证据真实性人工审查，不得由结构 validator 代替。

## 当前门禁

运行时代码修复和原失败回归已经通过；但“172 条矩阵全部执行并取得证据”仍是独立的 QA 退出条件。除已列出的生产证据外，未执行的 P0/P1 不得关闭，也不得以历史状态或页面可加载替代实际证据。下一轮应优先完成剩余 P0/P1 的受控故障注入、真实 CAD 输入和人工 Golden 样本审查，然后再给出矩阵整体放行结论。

## Golden 样本人工审查补充

对复测 ZIP 的结构和抽样资产进行了进一步检查，但不把结构检查冒充人工质量评分：

- HIST-004：DOCX 具有 33 个一级章节并包含合同要求的工程覆盖词；由于当前环境没有可用的 LibreOffice 渲染器，本轮未将 Word 的版式审查关闭为 PASS。
- HIST-005：PPTX 具有 31 页且包含合同术语；页面级图文布局和评审可读性仍需人工打开 Office 后评分。
- HIST-006：XLSX 的 Golden-121 validator 已确认 21 张工作表、公式和 Manifest 结构；工程师仍需抽查 BOM、DFMEA、IO、CT、成本和验证表的内容密度。
- HIST-007：视觉目录为 90 张 clean、4 张 annotated、2 张 diagram，文件非空且 SHA 不重复；抽样显示 annotated/diagram 仍是低信息量线框渲染，不能以此宣称达到 golden sample 的视觉质量，维持未关闭状态。
- HIST-008：概念 CAD 的 BREP、STEP、STL 文件存在且 STEP 具有 ISO-10303 头；产品 CAD 状态明确为 `NO_PRODUCT_CAD_PROVIDED`，因此本轮只确认事实边界，不对可制造性作通过结论。
- HIST-009：全文未把 FAT、SAT、MSA/GR&R 写成已执行 PASS；开放项和 `PLANNED_NOT_EXECUTED` 标记存在，真实性边界保持。
- HIST-010：成本和供应商内容明确为参考估算及待报价验证，未发现真实报价被伪装成已确认价格；正式报价真实性仍需原始报价单抽查。
