import { describe, expect, it } from "vitest";
import { mergeTaskEvents, reconcileTaskState } from "../public/event-state.js";

const event = (seq: number, state?: string, createdAt = `2026-09-22T00:00:${String(seq).padStart(2, "0")}Z`) => ({
  seq,
  type: state ? "TASK_STATE" : "STAGE_STARTED",
  ...(state ? { payload: { state } } : {}),
  createdAt,
});

describe("live task event reconciliation", () => {
  it("deduplicates and sorts responses that arrive out of order", () => {
    const merged = mergeTaskEvents([event(2), event(1)], [event(3), event(2, "PACKAGING")]);
    expect(merged.map((item) => item.seq)).toEqual([1, 2, 3]);
    expect(merged[1]!.payload).toEqual({ state: "PACKAGING" });
  });

  it("uses a newer state event when the task response is stale", () => {
    const task = { state: "RUNNING", updated_at: "2026-09-22T00:00:01Z" };
    expect(reconcileTaskState(task, [event(2, "PACKAGING", "2026-09-22T00:00:02Z")])!.state).toBe("PACKAGING");
  });

  it("keeps the D1 task state when it is newer than the event", () => {
    const task = { state: "PACKAGED", updated_at: "2026-09-22T00:00:03Z" };
    expect(reconcileTaskState(task, [event(2, "PACKAGING", "2026-09-22T00:00:02Z")])!.state).toBe("PACKAGED");
  });
});
