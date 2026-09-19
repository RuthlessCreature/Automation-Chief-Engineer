import { DurableObject } from "cloudflare:workers";
import type { TaskEvent } from "./domain";

type StoredEvent = {
  seq: number;
  type: TaskEvent["type"];
  stageId: string | null;
  message: string;
  payloadJson: string;
  createdAt: string;
};

export class TaskCoordinator extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS task_events (
          seq INTEGER PRIMARY KEY,
          type TEXT NOT NULL,
          stage_id TEXT,
          message TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
    });
  }

  async publish(event: Omit<TaskEvent, "seq">): Promise<TaskEvent> {
    const next = this.ctx.storage.sql.exec<{ next_seq: number }>(
      "SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM task_events",
    ).one().next_seq;
    this.ctx.storage.sql.exec(
      "INSERT INTO task_events (seq, type, stage_id, message, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      next,
      event.type,
      event.stageId ?? null,
      event.message,
      JSON.stringify(event.payload),
      event.createdAt,
    );
    return { ...event, seq: next };
  }

  async eventsAfter(sequence: number): Promise<TaskEvent[]> {
    return this.ctx.storage.sql
      .exec<StoredEvent>(
        "SELECT seq, type, stage_id as stageId, message, payload_json as payloadJson, created_at as createdAt FROM task_events WHERE seq > ? ORDER BY seq ASC",
        sequence,
      )
      .toArray()
      .map((row) => ({
        seq: row.seq,
        type: row.type,
        ...(row.stageId ? { stageId: row.stageId } : {}),
        message: row.message,
        payload: JSON.parse(row.payloadJson) as TaskEvent["payload"],
        createdAt: row.createdAt,
      }));
  }
}
