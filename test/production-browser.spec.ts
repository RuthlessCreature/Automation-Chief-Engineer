import { expect, test } from "@playwright/test";

const baseURL = process.env.ACE_PROD_URL ?? "https://zg.gaona.world";
const email = process.env.ACE_E2E_EMAIL;
const password = process.env.ACE_E2E_PASSWORD;

test.describe("production command center regression", () => {
  test.skip(!process.env.ACE_RUN_PROD_E2E || !email || !password, "set ACE_RUN_PROD_E2E=1, ACE_E2E_EMAIL and ACE_E2E_PASSWORD");

  test("task selection, multi-select, and inspector switch stay responsive", async ({ page }) => {
    await page.goto(baseURL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /登录 \/ 注册/ }).click();
    await page.locator("#auth-form input[name=email]").fill(email!);
    await page.locator("#auth-form input[name=password]").fill(password!);
    await page.locator("#auth-submit").click();
    await expect(page.locator("#task-list .task-row").first()).toBeVisible({ timeout: 20_000 });

    const rows = page.locator("#task-list .task-row");
    const firstId = await rows.nth(0).getAttribute("data-id");
    const secondId = await rows.nth(1).getAttribute("data-id");
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();

    await rows.nth(0).click();
    await expect(page.locator("#task-title")).not.toHaveText("");
    const firstTitle = await page.locator("#task-title").textContent();
    await page.locator(`#task-list .task-select[data-id="${firstId}"]`).check();
    await expect(page.locator(`#task-list .task-select[data-id="${firstId}"]`)).toBeChecked();
    expect(await page.locator("#task-title").textContent()).toBe(firstTitle);

    await rows.nth(1).click();
    await expect(page.locator("#task-title")).not.toHaveText(firstTitle ?? "");
    await expect(page.locator("#inspector-body")).not.toContainText("正在切换任务并加载最新过程证据", { timeout: 20_000 });

    const state = await page.locator("#task-state").textContent();
    if (["QUALITY_BLOCKED", "FAILED", "PACKAGED"].includes(state ?? "")) await expect(page.locator("#rework-task")).toBeVisible();
    if (state === "PACKAGED") {
      await page.locator('.layer-tab[data-layer="delivery"]').click();
      await expect(page.locator("#inspector-body")).toContainText("客户交付 ZIP 已冻结", { timeout: 20_000 });
      const downloadLink = page.locator('a.button.primary', { hasText: "下载客户 ZIP" });
      await expect(downloadLink).toHaveAttribute("href", /\/delivery\/download$/);
      const [download] = await Promise.all([page.waitForEvent("download"), downloadLink.click()]);
      expect(download.suggestedFilename()).toMatch(/^task-.*\.zip$/);
    } else {
      await page.locator('.layer-tab[data-layer="delivery"]').click();
      await expect(page.locator("#inspector-body")).toContainText("尚未冻结客户 ZIP", { timeout: 20_000 });
      await expect(page.locator('a.button.primary', { hasText: "下载客户 ZIP" })).toHaveCount(0);
    }
  });

  test("frozen Customer Delivery remains stable between poll cycles", async ({ page }) => {
    await page.goto(baseURL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /登录 \/ 注册/ }).click();
    await page.locator("#auth-form input[name=email]").fill(email!);
    await page.locator("#auth-form input[name=password]").fill(password!);
    await page.locator("#auth-submit").click();
    await expect(page.locator("#task-list .task-row").first()).toBeVisible({ timeout: 20_000 });

    const packaged = page.locator("#task-list .task-row", { hasText: "5015 | Golden-121 PROD rerun" }).first();
    test.skip(await packaged.count() === 0, "requires the production 5015 packaged regression task");
    await packaged.click();
    await expect(page.locator("#task-state")).toHaveText("PACKAGED", { timeout: 20_000 });
    await page.locator('.layer-tab[data-layer="delivery"]').click();
    const inspector = page.locator("#inspector-body");
    const download = page.locator('a.button.primary', { hasText: "下载客户 ZIP" });
    await expect(inspector).toContainText("客户交付 ZIP 已冻结", { timeout: 20_000 });
    await expect(download).toBeVisible();

    for (let index = 0; index < 12; index += 1) {
      await page.waitForTimeout(350);
      await expect(inspector).not.toContainText("尚未冻结客户 ZIP");
      await expect(download).toBeVisible();
    }
  });

  test("new-task cancel is side-effect free", async ({ page }) => {
    await page.goto(baseURL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /登录 \/ 注册/ }).click();
    await page.locator("#auth-form input[name=email]").fill(email!);
    await page.locator("#auth-form input[name=password]").fill(password!);
    await page.locator("#auth-submit").click();
    await expect(page.locator("#task-list")).toBeVisible({ timeout: 20_000 });
    const before = await page.locator("#task-list .task-row").count();
    await page.locator("#new-task").click();
    await expect(page.locator("#task-dialog")).toHaveJSProperty("open", true);
    await page.locator('#task-form input[name="title"]').fill("不会提交的回归任务");
    await page.locator('#task-form textarea[name="prompt"]').fill("这个表单只验证取消行为，不允许创建任何真实任务或触发工作流。");
    await page.locator('[data-close-dialog="task-dialog"]').click();
    await expect(page.locator("#task-dialog")).toHaveJSProperty("open", false);
    await expect(page.locator("#task-list .task-row")).toHaveCount(before);
  });

  test("slow task response cannot overwrite a later selection", async ({ page }) => {
    await page.goto(baseURL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /登录 \/ 注册/ }).click();
    await page.locator("#auth-form input[name=email]").fill(email!);
    await page.locator("#auth-form input[name=password]").fill(password!);
    await page.locator("#auth-submit").click();
    const rows = page.locator("#task-list .task-row");
    await expect(rows.first()).toBeVisible({ timeout: 20_000 });
    test.skip(await rows.count() < 2, "requires at least two existing tasks");
    const firstId = await rows.nth(0).getAttribute("data-id");
    const secondId = await rows.nth(1).getAttribute("data-id");
    const secondTitle = await rows.nth(1).locator("b").textContent();
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();

    await page.route(`**/api/tasks/${firstId}`, async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({ response });
    });
    await rows.nth(0).click();
    await rows.nth(1).click();
    await expect(page.locator("#task-title")).toHaveText(secondTitle ?? "", { timeout: 20_000 });
    await expect(page.locator(`.task-row[data-id="${secondId}"]`)).toHaveClass(/active/);
  });
});
