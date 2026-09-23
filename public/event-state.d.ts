export type TaskEvent = {
  seq: number;
  type: string;
  payload?: Record<string, unknown>;
  createdAt?: string;
};

export function mergeTaskEvents(existing: TaskEvent[], incoming: TaskEvent[]): TaskEvent[];

export function reconcileTaskState(
  task: { state: string; updated_at?: string; updatedAt?: string } | null,
  events: TaskEvent[],
): { state: string; updated_at?: string; updatedAt?: string } | null;
