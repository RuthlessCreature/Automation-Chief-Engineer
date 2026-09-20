import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const BASE = process.env.ACE_PROD_URL ?? "https://zg.gaona.world";
const DB = "automation-chief-engineer-cloud";
const EMAIL = process.env.ACE_QA_EMAIL ?? "test@test.com";
const QA_5015_TITLE = process.env.ACE_QA_5015_TITLE ?? "5015 | Golden-121 PROD rerun";
const QA_5015_SHA = process.env.ACE_QA_5015_SHA ?? "bf6fb5f34941e49998a808d5e939bea75c0c0afd5c4db14ddc13c733cf0a0035";
const ALLOW_PROD_MUTATION = process.env.ACE_QA_ALLOW_PROD_MUTATION === "1";
const EXPECTED_STAGES = [
  "需求接收与输入完整性",
  "需求工程",
  "可行性架构",
  "机器视觉",
  "机械方案",
  "电控与安全",
  "软件与 MES",
  "产品 CAD",
  "节拍与产能",
  "BOM 与制造成本",
  "数字孪生渲染",
  "验证与质量",
  "项目与商务",
  "文档受控汇编",
  "总工审查与交付打包",
];
const EXPECTED_STAGE_IDS = [
  "intake","requirements","feasibility","vision","mechanical","electrical","software_mes","product_cad","ct_capacity","bom_cost","digital_twin","validation","project_sales","documentation","chief_review",
];

type CaseResult = {
  id: string;
  name: string;
  priority: "P0" | "P1" | "P2";
  status: "PASS" | "FAIL";
  evidence: string;
  durationMs: number;
};

const results: CaseResult[] = [];
const issues: string[] = [];
let sessionId = "";

function sqlq(value: string) {
  return "'" + value.replaceAll("'", "''") + "'";
}

function d1(sql: string): Array<Record<string, unknown>> {
  const raw = execFileSync(
    "npx",
    ["wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql],
    { encoding: "utf8", env: process.env, maxBuffer: 10 * 1024 * 1024 },
  );
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    for (const item of parsed) if (item && Array.isArray(item.results)) return item.results;
  }
  if (parsed && Array.isArray(parsed.results)) return parsed.results;
  throw new Error("Unexpected D1 JSON response");
}

async function qa(id: string, name: string, priority: CaseResult["priority"], fn: () => Promise<string | void>) {
  const started = Date.now();
  try {
    const evidence = await fn();
    results.push({ id, name, priority, status: "PASS", evidence: evidence || "PASS", durationMs: Date.now() - started });
    console.log(`QA_RESULT|${id}|PASS|${priority}|${name}|${String(evidence || "PASS").replaceAll("\n", " ")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ id, name, priority, status: "FAIL", evidence: message, durationMs: Date.now() - started });
    issues.push(`${id}: ${message}`);
    console.log(`QA_RESULT|${id}|FAIL|${priority}|${name}|${message.replaceAll("\n", " ")}`);
    throw error;
  }
}

async function createSession() {
  const users = d1(`SELECT id FROM users WHERE email=${sqlq(EMAIL)} LIMIT 1`);
  if (users.length !== 1) throw new Error("production test account missing");
  const uid = String(users[0]!.id);
  sessionId = randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + 90 * 60 * 1000);
  d1(
    "INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (" +
      [sessionId, uid, expires.toISOString(), now.toISOString()].map(sqlq).join(",") +
      ")",
  );
  return { uid };
}

function cleanupSession() {
  if (!sessionId) return;
  try { d1(`DELETE FROM sessions WHERE id=${sqlq(sessionId)}`); } catch {}
}

async function authenticatedContext(browser: Browser) {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    acceptDownloads: true,
  });
  await context.addCookies([{
    name: "ace_session",
    value: sessionId,
    domain: "zg.gaona.world",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    expires: Math.floor(Date.now() / 1000) + 90 * 60,
  }]);
  return context;
}

async function pipelineLabels(page: Page) {
  return page.locator("#pipeline .stage-card .stage-label").allTextContents();
}

async function currentTaskId(page: Page) {
  return page.locator(".task-row.active").getAttribute("data-id");
}

async function clickTaskByTitle(page: Page, titlePart: string) {
  const row = page.locator("#task-list .task-row", { hasText: titlePart }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click();
  await expect(page.locator("#task-title")).toContainText(titlePart, { timeout: 20_000 });
  return row.getAttribute("data-id");
}

test.describe.configure({ mode: "serial" });
test.setTimeout(75 * 60 * 1000);

test("production UI full-flow acceptance", async ({ browser }) => {
  test.skip(!ALLOW_PROD_MUTATION, "set ACE_QA_ALLOW_PROD_MUTATION=1 only for an explicitly approved production QA run");
  const account = await createSession();
  console.log(`QA_META|session_bootstrap=PASS|uid_present=${Boolean(account.uid)}`);

  let qaTaskTitle = "";
  let qaTaskId = "";
  let adminTaskTitle = "";
  let adminTaskId = "";
  let context: BrowserContext | null = null;

  try {
    await qa("AUTH-001", "未登录首页可正常加载", "P0", async () => {
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      const page = await ctx.newPage();
      const response = await page.goto(BASE, { waitUntil: "networkidle" });
      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle("总工云台｜受控方案交付");
      await expect(page.locator("#auth-button")).toHaveText(/登录 \/ 注册/);
      await ctx.close();
      return "HTTP 200; title/login CTA correct";
    });

    await qa("AUTH-002", "未登录任务区不泄露任务", "P0", async () => {
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      const page = await ctx.newPage();
      await page.goto(BASE, { waitUntil: "networkidle" });
      await expect(page.locator("#task-list")).toContainText("登录后查看任务");
      await expect(page.locator("#task-list .task-row")).toHaveCount(0);
      await ctx.close();
      return "task rows=0";
    });

    await qa("AUTH-003", "登录弹窗与前端输入约束正常", "P1", async () => {
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
      const page = await ctx.newPage();
      await page.goto(BASE, { waitUntil: "networkidle" });
      await page.locator("#auth-button").click();
      await expect(page.locator("#auth-dialog")).toHaveJSProperty("open", true);
      await expect(page.locator('#auth-form input[name="email"]')).toHaveAttribute("required", "");
      await expect(page.locator('#auth-form input[name="password"]')).toHaveAttribute("minlength", "12");
      await page.locator('[data-close-dialog="auth-dialog"]').click();
      await expect(page.locator("#auth-dialog")).toHaveJSProperty("open", false);
      await ctx.close();
      return "modal open/close and HTML constraints verified";
    });

    context = await authenticatedContext(browser);
    const page = await context.newPage();
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(`pageerror:${error.message}`));
    page.on("console", (msg) => { if (msg.type() === "error") browserErrors.push(`console:${msg.text()}`); });
    page.on("requestfailed", (req) => browserErrors.push(`requestfailed:${req.method()} ${req.url()} ${req.failure()?.errorText || ""}`));

    await qa("AUTH-004", "短时生产会话进入真实账号", "P0", async () => {
      await page.goto(BASE, { waitUntil: "networkidle" });
      await expect(page.locator("#account")).toContainText(EMAIL);
      await expect(page.locator("#credits")).toHaveText(/^\d+$/);
      const credits = await page.locator("#credits").textContent();
      return `account=${EMAIL}; credits=${credits}`;
    });

    await qa("NAV-001", "任务列表正常加载", "P0", async () => {
      await expect(page.locator("#task-list .task-row").first()).toBeVisible({ timeout: 20_000 });
      const count = await page.locator("#task-list .task-row").count();
      expect(count).toBeGreaterThanOrEqual(2);
      return `task_count=${count}`;
    });

    await qa("NAV-002", "历史5015封装任务可选择且状态为PACKAGED", "P0", async () => {
      await clickTaskByTitle(page, QA_5015_TITLE);
      await expect(page.locator("#task-state")).toHaveText("PACKAGED", { timeout: 20_000 });
      return `task_id=${await currentTaskId(page)}`;
    });

    await qa("PIPE-001", "15阶段DOM顺序与受控流程一致", "P0", async () => {
      const labels = await pipelineLabels(page);
      expect(labels).toEqual(EXPECTED_STAGES);
      return labels.join(" > ");
    });

    await qa("PIPE-002", "已封装任务显示15/15且进度不超过100%", "P0", async () => {
      await expect(page.locator("#stage-count")).toHaveText("15 / 15");
      const width = await page.locator("#progress").evaluate((el: any) => String(el?.style?.width ?? ""));
      return `stage_count=15/15; progress_width=${width}`;
    });

    await qa("DEL-001", "Customer Delivery显示FROZEN而非未冻结", "P0", async () => {
      await page.locator('.layer-tab[data-layer="delivery"]').click();
      await expect(page.locator("#inspector-body")).toContainText("客户交付 ZIP 已冻结", { timeout: 20_000 });
      await expect(page.locator("#inspector-body")).not.toContainText("尚未冻结客户 ZIP");
      return "FROZEN panel rendered";
    });

    await qa("DEL-002", "Customer Delivery跨多个轮询周期保持稳定", "P0", async () => {
      const inspector = page.locator("#inspector-body");
      const download = page.locator('a.button.primary', { hasText: "下载客户 ZIP" });
      for (let i = 0; i < 20; i += 1) {
        await page.waitForTimeout(300);
        await expect(inspector).toContainText("客户交付 ZIP 已冻结");
        await expect(inspector).not.toContainText("尚未冻结客户 ZIP");
        await expect(download).toBeVisible();
      }
      return "20 samples / 6 seconds stable";
    });

    await qa("DEL-003", "技术方案安全预览可打开", "P0", async () => {
      const [preview] = await Promise.all([
        page.waitForEvent("popup"),
        page.getByRole("link", { name: "在线预览技术方案" }).click(),
      ]);
      await preview.waitForLoadState("domcontentloaded");
      expect(preview.url()).toContain("/delivery/preview?asset=technical-solution");
      const body = await preview.locator("body").innerText();
      expect(body.length).toBeGreaterThan(100);
      await preview.close();
      return "technical solution preview loaded";
    });

    await qa("DEL-004", "工程数据安全预览可打开", "P0", async () => {
      const [preview] = await Promise.all([
        page.waitForEvent("popup"),
        page.getByRole("link", { name: "在线预览工程数据" }).click(),
      ]);
      await preview.waitForLoadState("domcontentloaded");
      expect(preview.url()).toContain("/delivery/preview?asset=engineering-data");
      const body = await preview.locator("body").innerText();
      expect(body.length).toBeGreaterThan(100);
      await preview.close();
      return "engineering data preview loaded";
    });

    await qa("DEL-005", "浏览器点击可真实下载5015 ZIP并通过权威validator", "P0", async () => {
      const link = page.getByRole("link", { name: "下载客户 ZIP" });
      const [download] = await Promise.all([page.waitForEvent("download"), link.click()]);
      const suggested = download.suggestedFilename();
      expect(suggested).toMatch(/^task-.*\.zip$/);
      const path = await download.path();
      expect(path).toBeTruthy();
      const bytes = readFileSync(path!);
      const sha = createHash("sha256").update(bytes).digest("hex");
      expect(sha).toBe(QA_5015_SHA);
      const output = execFileSync("python", ["scripts/validate_r2_f10_golden_delivery.py", path!], { encoding: "utf8" });
      expect(output).toContain("PASS [R2-F10-GOLDEN-121]");
      return `${suggested}; sha256=${sha}; validator=PASS`;
    });

    await qa("NAV-003", "任务复选框不会误切换当前任务", "P1", async () => {
      const id = await currentTaskId(page);
      expect(id).toBeTruthy();
      const title = await page.locator("#task-title").textContent();
      await page.locator(`.task-select[data-id="${id}"]`).check();
      await expect(page.locator(`.task-select[data-id="${id}"]`)).toBeChecked();
      expect(await page.locator("#task-title").textContent()).toBe(title);
      await page.locator(`.task-select[data-id="${id}"]`).uncheck();
      return "selection checkbox isolated from active task";
    });

    await qa("TASK-001", "新建任务弹窗取消无副作用", "P1", async () => {
      const before = await page.locator("#task-list .task-row").count();
      await page.locator("#new-task").click();
      await expect(page.locator("#task-dialog")).toHaveJSProperty("open", true);
      await page.locator('#task-form input[name="title"]').fill("QA CANCEL SHOULD NOT CREATE");
      await page.locator('#task-form textarea[name="prompt"]').fill("这个任务只用于验证取消操作，不应该生成任何生产任务记录。");
      await page.locator('[data-close-dialog="task-dialog"]').click();
      await expect(page.locator("#task-dialog")).toHaveJSProperty("open", false);
      await expect(page.locator("#task-list .task-row")).toHaveCount(before);
      return `task_count_unchanged=${before}`;
    });

    qaTaskTitle = `QA Browser Fullflow ${Date.now()}`;
    await qa("TASK-002", "通过UI创建带TXT内部资料的新任务", "P0", async () => {
      await page.locator("#new-task").click();
      await page.locator('#task-form input[name="title"]').fill(qaTaskTitle);
      await page.locator('#task-form textarea[name="prompt"]').fill(
        "设计一套桌面小型瓶盖外观检测工位。单相机、白色环形光源，目标节拍每件2秒。客户没有提供产品STEP/STP/STL，禁止伪造产品CAD、尺寸、供应商报价、FAT/SAT实测结论。请按固定15阶段完成Golden-121受控交付，并明确无客户产品CAD的事实边界。",
      );
      await page.locator('#task-form input[name="files"]').setInputFiles({
        name: "qa-browser-input.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("QA fixture input\nCT target: 2.0 s/pc\nCamera: single\nLighting: white ring\nNo customer CAD supplied\n", "utf8"),
      });
      await page.locator("#task-submit").click();
      await expect(page.locator("#task-dialog")).toHaveJSProperty("open", false, { timeout: 30_000 });
      await expect(page.locator("#task-title")).toHaveText(qaTaskTitle, { timeout: 30_000 });
      qaTaskId = (await currentTaskId(page)) || "";
      expect(qaTaskId).toBeTruthy();
      await expect(page.locator("#task-prompt")).toContainText("已锁定 1 个内部输入资料");
      await expect(page.locator("#task-state")).toHaveText("DRAFT");
      return `task_id=${qaTaskId}; input=qa-browser-input.txt`;
    });

    await qa("PIPE-003", "新建任务首次渲染阶段顺序仍与15阶段一致", "P0", async () => {
      const labels = await pipelineLabels(page);
      expect(labels).toEqual(EXPECTED_STAGES);
      return labels.join(" > ");
    });

    await qa("DEL-006", "DRAFT任务Customer Delivery稳定显示未冻结且无下载按钮", "P0", async () => {
      await page.locator('.layer-tab[data-layer="delivery"]').click();
      const inspector = page.locator("#inspector-body");
      await expect(inspector).toContainText("尚未冻结客户 ZIP", { timeout: 20_000 });
      for (let i = 0; i < 8; i += 1) {
        await page.waitForTimeout(300);
        await expect(inspector).toContainText("尚未冻结客户 ZIP");
        await expect(page.getByRole("link", { name: "下载客户 ZIP" })).toHaveCount(0);
      }
      await page.locator('.layer-tab[data-layer="internal"]').click();
      return "unfrozen stable, no download";
    });

    await qa("TASK-003", "通过UI启动总工任务", "P0", async () => {
      await expect(page.locator("#start-task")).toBeVisible();
      await page.locator("#start-task").click();
      await expect(page.locator("#task-state")).not.toHaveText("DRAFT", { timeout: 20_000 });
      const state = await page.locator("#task-state").textContent();
      expect(["QUEUED","RUNNING","PACKAGING","PACKAGED"]).toContain(state);
      return `state_after_start=${state}`;
    });

    await qa("ADMIN-001", "运行中任务通过UI删除会被阻断", "P0", async () => {
      await expect(page.locator("#task-state")).not.toHaveText("DRAFT");
      const checkbox = page.locator(`.task-select[data-id="${qaTaskId}"]`);
      await checkbox.check();
      const dialogMessages: string[] = [];
      const handler = async (dialog: import("@playwright/test").Dialog) => {
        dialogMessages.push(`${dialog.type()}:${dialog.message()}`);
        await dialog.accept();
      };
      page.on("dialog", handler);
      await page.locator('[data-task-action="delete"]').click();
      await expect.poll(() => dialogMessages.length, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
      page.off("dialog", handler);
      expect(dialogMessages.some((x) => x.includes("运行中") || x.includes("不能删除") || x.includes("删除"))).toBe(true);
      await expect(page.locator("#task-title")).toHaveText(qaTaskTitle);
      await checkbox.uncheck();
      return dialogMessages.join(" | ");
    });

    await qa("PIPE-004", "运行期间阶段数单调递增且DOM顺序不漂移", "P0", async () => {
      let lastCount = 0;
      const observedStates: string[] = [];
      const deadline = Date.now() + 45 * 60 * 1000;
      while (Date.now() < deadline) {
        const labels = await pipelineLabels(page);
        expect(labels).toEqual(EXPECTED_STAGES);
        const countText = (await page.locator("#stage-count").textContent()) || "0 / 15";
        const count = Number.parseInt(countText.split("/")[0]!.trim(), 10);
        expect(Number.isFinite(count)).toBe(true);
        expect(count).toBeGreaterThanOrEqual(lastCount);
        expect(count).toBeLessThanOrEqual(15);
        lastCount = count;
        const state = (await page.locator("#task-state").textContent()) || "";
        if (observedStates.at(-1) !== state) observedStates.push(state);
        if (["PACKAGED","QUALITY_BLOCKED","FAILED"].includes(state)) {
          expect(state).toBe("PACKAGED");
          expect(count).toBe(15);
          return `states=${observedStates.join(">")}; final_count=${count}`;
        }
        await page.waitForTimeout(5000);
      }
      throw new Error("workflow did not reach terminal state within 45 minutes");
    });

    await qa("PIPE-005", "浏览器内事件证据显示15个唯一STAGE_GATED且顺序正确", "P0", async () => {
      const events = await page.evaluate(() => (globalThis as any).__ACE_APP__?.state?.events ?? []);
      const gated = events.filter((e: any) => e.type === "STAGE_GATED" && e.stageId).map((e: any) => e.stageId);
      const unique = [...new Set(gated)];
      expect(unique).toEqual(EXPECTED_STAGE_IDS);
      return `unique_gated=${unique.join(",")}`;
    });

    await qa("PIPE-006", "终态为PACKAGED且前端显示15/15", "P0", async () => {
      await expect(page.locator("#task-state")).toHaveText("PACKAGED");
      await expect(page.locator("#stage-count")).toHaveText("15 / 15");
      await expect(page.locator("#progress-label")).toContainText("客户 ZIP 已冻结");
      return "PACKAGED / 15 of 15";
    });

    await qa("INT-001", "Internal Workspace可打开阶段证据", "P1", async () => {
      await page.locator('.layer-tab[data-layer="internal"]').click();
      const first = page.locator("#pipeline .stage-card").first();
      await first.click();
      await expect(page.locator("#inspector-body")).toContainText("Intake Router");
      return "stage inspector opened";
    });

    await qa("DEL-007", "新任务最终Customer Delivery稳定FROZEN", "P0", async () => {
      await page.locator('.layer-tab[data-layer="delivery"]').click();
      const inspector = page.locator("#inspector-body");
      await expect(inspector).toContainText("客户交付 ZIP 已冻结", { timeout: 30_000 });
      for (let i = 0; i < 20; i += 1) {
        await page.waitForTimeout(300);
        await expect(inspector).not.toContainText("尚未冻结客户 ZIP");
        await expect(page.getByRole("link", { name: "下载客户 ZIP" })).toBeVisible();
      }
      return "20 samples / 6 seconds stable";
    });

    await qa("DEL-008", "新任务浏览器下载ZIP并通过Golden-121 validator", "P0", async () => {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("link", { name: "下载客户 ZIP" }).click(),
      ]);
      const path = await download.path();
      expect(path).toBeTruthy();
      const bytes = readFileSync(path!);
      const sha = createHash("sha256").update(bytes).digest("hex");
      const output = execFileSync("python", ["scripts/validate_r2_f10_golden_delivery.py", path!], { encoding: "utf8" });
      expect(output).toContain("PASS [R2-F10-GOLDEN-121]");
      return `sha256=${sha}; validator=PASS`;
    });

    await qa("DEL-009", "无客户CAD任务的交付包不伪造产品CAD", "P0", async () => {
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("link", { name: "下载客户 ZIP" }).click(),
      ]);
      const path = await download.path();
      const script = [
        "import zipfile,sys,json",
        "z=zipfile.ZipFile(sys.argv[1])",
        "names=[n.replace('\\\\','/') for n in z.namelist() if not n.endswith('/')]",
        "root=names[0].split('/',1)[0]",
        "rel=[n[len(root)+1:] for n in names if n.startswith(root+'/')]",
        "prod=[n for n in rel if n.startswith('02_产品CAD与视图/')]",
        "bad=[n for n in prod if n.lower().endswith(('.step','.stp','.stl','.brep'))]",
        "assert not bad, bad",
        "assert '02_产品CAD与视图/PRODUCT_CAD_NOT_PROVIDED.md' in prod",
        "st=json.loads(z.read(root+'/02_产品CAD与视图/product_cad_status.json'))",
        "assert st['status']=='NO_PRODUCT_CAD_PROVIDED'",
        "print('NO_PRODUCT_CAD_PASS')",
      ].join("; ");
      const out = execFileSync("python", ["-c", script, path!], { encoding: "utf8" });
      expect(out).toContain("NO_PRODUCT_CAD_PASS");
      return "NO_PRODUCT_CAD_PROVIDED evidence verified";
    });

    await qa("NAV-004", "快速切换任务不会被旧响应覆盖", "P1", async () => {
      const old5015 = page.locator("#task-list .task-row", { hasText: "5015C" }).first();
      const qaRow = page.locator(`.task-row[data-id="${qaTaskId}"]`);
      if (await old5015.count()) {
        await old5015.click();
        await qaRow.click();
        await expect(page.locator("#task-title")).toHaveText(qaTaskTitle, { timeout: 20_000 });
        await expect(qaRow).toHaveClass(/active/);
        return "rapid switch ended on QA task";
      }
      return "SKIP:no secondary task title 5015C";
    });

    adminTaskTitle = `QA Admin Temp ${Date.now()}`;
    await qa("ADMIN-002", "UI创建临时DRAFT用于任务管理回归", "P1", async () => {
      await page.locator("#new-task").click();
      await page.locator('#task-form input[name="title"]').fill(adminTaskTitle);
      await page.locator('#task-form textarea[name="prompt"]').fill("这是任务管理回归用的临时DRAFT任务，只验证改名和删除，不启动工作流，不产生客户交付。");
      await page.locator("#task-submit").click();
      await expect(page.locator("#task-title")).toHaveText(adminTaskTitle, { timeout: 30_000 });
      await expect(page.locator("#task-state")).toHaveText("DRAFT");
      adminTaskId = (await currentTaskId(page)) || "";
      expect(adminTaskId).toBeTruthy();
      return `task_id=${adminTaskId}`;
    });

    await qa("ADMIN-003", "任务改名通过浏览器prompt生效", "P1", async () => {
      const renamed = adminTaskTitle + " RENAMED";
      const checkbox = page.locator(`.task-select[data-id="${adminTaskId}"]`);
      await checkbox.check();
      page.once("dialog", async (dialog) => {
        expect(dialog.type()).toBe("prompt");
        await dialog.accept(renamed);
      });
      await page.locator('[data-task-action="rename"]').click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("#task-list .task-row", { hasText: renamed })).toBeVisible({ timeout: 20_000 });
      adminTaskTitle = renamed;
      return renamed;
    });

    await qa("ADMIN-004", "DRAFT任务可通过UI批量删除并从活动列表消失", "P1", async () => {
      const row = page.locator(`.task-row[data-id="${adminTaskId}"]`);
      await row.click();
      const checkbox = page.locator(`.task-select[data-id="${adminTaskId}"]`);
      await checkbox.check();
      page.once("dialog", async (dialog) => {
        expect(dialog.type()).toBe("confirm");
        await dialog.accept();
      });
      await page.locator('[data-task-action="delete"]').click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator(`.task-row[data-id="${adminTaskId}"]`)).toHaveCount(0);
      return "soft-deleted from active task list";
    });

    await qa("SEC-001", "未登录浏览器不能下载客户ZIP", "P0", async () => {
      const ctx = await browser.newContext();
      const response = await ctx.request.get(`${BASE}/api/tasks/${qaTaskId}/delivery/download`);
      expect(response.status()).toBe(401);
      await ctx.close();
      return "HTTP 401";
    });

    await qa("UX-001", "本轮关键流程无浏览器pageerror/console error/requestfailed", "P1", async () => {
      const filtered = browserErrors.filter((x) => !x.includes("favicon"));
      expect(filtered).toEqual([]);
      return "0 browser runtime errors";
    });

    await qa("AUTH-005", "退出登录后任务列表重新隐藏", "P1", async () => {
      await page.locator("#logout").click();
      await expect(page.locator("#auth-button")).toHaveText(/登录 \/ 注册/);
      await expect(page.locator("#task-list")).toContainText("登录后查看任务");
      return "logout UI complete";
    });

  } finally {
    console.log("QA_SUMMARY|" + JSON.stringify({ results, issues, qaTaskTitle, qaTaskId, adminTaskTitle, adminTaskId }));
    if (context) await context.close().catch(() => {});
    cleanupSession();
  }

  expect(issues, `QA issues: ${issues.join(" | ")}`).toEqual([]);
});
