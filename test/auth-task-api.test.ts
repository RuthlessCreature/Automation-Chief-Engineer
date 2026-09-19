import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

async function register(email: string): Promise<string> {
  const response = await SELF.fetch("https://worker.test/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "correct-horse-battery-staple" }),
  });
  expect(response.status).toBe(201);
  const setCookie = response.headers.get("Set-Cookie");
  expect(setCookie).toContain("ace_session=");
  return setCookie!.split(";")[0]!;
}

describe("authenticated task API", () => {
  it("creates a task for its owner and refuses another account's read", async () => {
    const ownerCookie = await register("owner@example.com");
    const otherCookie = await register("other@example.com");
    const create = await SELF.fetch("https://worker.test/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ title: "Owner task", prompt: "为测试账号创建一个具备可审查输入、工程约束和交付范围的受控任务。" }),
    });
    expect(create.status).toBe(201);
    const payload = await create.json<{ task: { id: string } }>();
    const denied = await SELF.fetch(`https://worker.test/api/tasks/${payload.task.id}`, { headers: { Cookie: otherCookie } });
    expect(denied.status).toBe(404);
  });

  it("stores a format-validated input privately against a draft task", async () => {
    const ownerCookie = await register("uploader@example.com");
    const create = await SELF.fetch("https://worker.test/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: ownerCookie },
      body: JSON.stringify({ title: "Input task", prompt: "为带有工程输入文件的任务建立受控方案，且保持输入资料在内部工作区内可追溯。" }),
    });
    const payload = await create.json<{ task: { id: string } }>();
    const upload = await SELF.fetch(`https://worker.test/api/tasks/${payload.task.id}/inputs`, {
      method: "POST",
      headers: { Cookie: ownerCookie, "Content-Type": "text/plain", "X-File-Name": "requirements.txt" },
      body: "cycle time <= 12 seconds",
    });
    expect(upload.status).toBe(201);
    const inputs = await SELF.fetch(`https://worker.test/api/tasks/${payload.task.id}/inputs`, { headers: { Cookie: ownerCookie } });
    await expect(inputs.json()).resolves.toMatchObject({ inputs: [{ original_name: "requirements.txt", intake_status: "STAGED_FORMAT_VALIDATED" }] });
  });
});
