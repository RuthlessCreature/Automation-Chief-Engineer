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
    if (state === "QUALITY_BLOCKED") await expect(page.locator("#rework-task")).toBeVisible();
    if (state === "PACKAGED") {
      await page.locator('.layer-tab[data-layer="delivery"]').click();
      await expect(page.locator("#inspector-body")).toContainText("客户交付 ZIP 已冻结", { timeout: 20_000 });
      const downloadLink = page.locator('a.button.primary', { hasText: "下载客户 ZIP" });
      await expect(downloadLink).toHaveAttribute("href", /\/delivery\/download$/);
      const [download] = await Promise.all([page.waitForEvent("download"), downloadLink.click()]);
      expect(download.suggestedFilename()).toMatch(/^task-.*\.zip$/);
    }
  });
});
