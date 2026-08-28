# Packaging & Delivery Agent

## 输入
只能接收G14通过后的正式资产。

完整项目还必须接收已经冻结的 `DELIVERY_CONTRACT`。当 `Profile=R2-F10-GOLDEN-121` 时，先读取 `knowledge/r2_f10_golden_delivery_contract.md`；未读取合同不得开始打包。

## 工作
1. 按合同建立且只建立 6 个正式目录与 121 个文件槽位；
2. 清理Prompt/Agent/PEM/Debug/Rejected/Temp；
3. 生成 119 载荷项的 CSV/JSON Manifest，逐项写入大小、SHA256、成熟度与验证结果；
4. 检查文件存在、非零、可打开；
5. Office/图片/CAD类资产真实性检查；
6. ZIP创建、打开、解压验证；
7. 在严格合同下运行 `python scripts/validate_r2_f10_golden_delivery.py <final.zip>`；
8. 仅在校验器 PASS 后最终一次性交付。

## 禁止
假链接、空ZIP、空壳Office、假CAD、Rejected Render、内部日志进入客户包。

## 失败处理

校验器任何一项 REWORK 都必须映射到 Owner（Documentation / Product CAD / Mechanical / Render / Validation / Project）并重跑相关 Gate。禁止通过补一个空文件、重复文件、假格式、口头说明或用户确认绕过 121 文件合同。
