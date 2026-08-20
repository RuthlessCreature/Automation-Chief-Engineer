# Capability Registry — V12功能责任映射

本表用于保证“重构不删功能”。若活跃模块缺规则，必须回查 `legacy/V12_full_prompt.md`。

| 能力 | Owner Agent | Gate/Reviewer |
|---|---|---|
| Pure GPT / One-shot / no user checkpoint | Chief Orchestrator | G14/G15 |
| Input Manifest / file parse / CAD priority | Intake Router | G00 |
| FACT/CALC/RULE/AI/ASM/TBD/POC/RISK/CONFLICT | Requirement | G01 |
| Requirement / FAI / CTQ / Customer Action | Requirement | G01 |
| PEM / IDs / Traceability | Orchestrator + Requirement | G14 |
| Product Master Asset / Geometry Lock / Coordinate Lock | Product/CAD | G02/G10 |
| CAD standard views / sections / annotation | Product/CAD | G02 |
| DFI / Feasibility / Engineering Conflict | Feasibility | G03 |
| S1 Economy / S2 Recommended / S3 Performance | Feasibility | G03 |
| Vision cards / FOV / Resolution / WD / DOF | Vision | G04 |
| Lighting / polarization / multi-light / HDR | Vision | G04 |
| Traditional CV / AI / dataset / leakage / metrics | Vision | G04 |
| Area scan / line scan / motion blur | Vision | G04 |
| Fixture 3-2-1 / clamp / poka-yoke / changeover | Mechanical | G05 |
| Robot payload / reach / TCP / collision / EOAT | Mechanical | G05 |
| Machine layout / frame / guard / doors / maintenance | Mechanical | G05 |
| Active Engineering Completion | Mechanical/All | G05/G14 |
| Electrical power / PSU / IO / network / safety | Electrical | G06 |
| PLC state machine / alarm / recovery | Software/MES | G07 |
| HMI / Recipe / MES / Traceability | Software/MES | G07 |
| Detailed CT / parallelism / bottleneck / UPH | CT | G08 |
| Storage / bandwidth / image retention | CT + Software | G08 |
| Assembly / subassembly / part metadata / drawings | BOM/Mfg | G09 |
| Procurement BOM model-specific | BOM/Mfg | G09 |
| Supplier / lead-time / alternatives | BOM/Mfg | G09 |
| CNC / sheet metal / welding / surface / assembly | BOM/Mfg | G09 |
| DFM / DFA | BOM/Mfg | G09 |
| Cost / margin / markup / quotation basis | BOM/Mfg + Sales | G09/G12 |
| True Digital Twin / Master Scene | Render | G10 |
| Product same-scene 3D / no 2D composite | Render | G10 |
| Photoreal route / no low-poly customer render | Render | G10 |
| Hero100 / 100+ valid views | Render | G10 |
| Render vs Diagram separation | Render | G10 |
| CJK font/glyph safe / clean+annotated view | Render + Docs | G10/G13 |
| Visual Utilization Map | Render + Docs | G13 |
| Office utilization >=70% / PPT >=80% visual pages | Docs | G13 |
| Word customer/engineering usable | Docs | G13 |
| PPT client review usable | Docs | G13 |
| Excel engineering usable + formulas | Docs | G13 |
| Risk / FMEA | Validation | G11 |
| POC / DOE | Validation | G11 |
| MSA / GRR | Validation | G11 |
| FAT / SAT / acceptance | Validation | G11 |
| False Accept / False Reject | Validation | G11 |
| WBS / milestone / critical path | Project/Sales | G12 |
| DR0-DR5 / ECN / revision control | Project/Sales | G12 |
| Scope / supplier / customer responsibilities | Project/Sales | G12 |
| Sales proposal / ROI / tender / negotiation | Project/Sales | G12 |
| AI Chief Engineer cross-review / dependency propagation | Chief Reviewer | G14 |
| Manifest / ZIP / real-file validation | Packaging | G15 |
| No fake files / links / PASS | All | Every Gate |
| Chinese professional terminology / WYSIWYG role usability | Docs + Chief | G13/G14 |

## Legacy completeness rule

V12原文是最终兜底。如果用户要求V12中任何未在表中明确列出的细节功能，Orchestrator必须搜索Legacy并路由给最接近Owner，不能以“新架构没写”为理由删除。
