import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("per-task event coordinator", () => {
  it("serializes events per task and keeps task streams isolated", async () => {
    const first = env.TASK_COORDINATOR.getByName("task-a");
    const second = env.TASK_COORDINATOR.getByName("task-b");
    await first.publish({ type: "TASK_STATE", message: "queued", payload: { state: "QUEUED" }, createdAt: "2026-09-17T00:00:00.000Z" });
    await first.publish({ type: "STAGE_STARTED", stageId: "intake", message: "started", payload: { agent: "Intake" }, createdAt: "2026-09-17T00:00:01.000Z" });
    await second.publish({ type: "TASK_STATE", message: "other", payload: { state: "QUEUED" }, createdAt: "2026-09-17T00:00:02.000Z" });
    await expect(first.eventsAfter(0)).resolves.toMatchObject([{ seq: 1, message: "queued" }, { seq: 2, stageId: "intake" }]);
    await expect(second.eventsAfter(0)).resolves.toMatchObject([{ seq: 1, message: "other" }]);
  });
});
