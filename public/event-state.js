// Shared browser-side state reconciliation for the live orchestration view.
// The Worker event stream is ordered by its per-task sequence number, while
// task and event endpoints are read independently and may observe different
// moments of the same workflow transition.
export function mergeTaskEvents(existing, incoming) {
  const bySeq = new Map(existing.map((event) => [event.seq, event]));
  for (const event of incoming) bySeq.set(event.seq, event);
  return [...bySeq.values()].sort((a, b) => a.seq - b.seq);
}

export function reconcileTaskState(task, events) {
  const stateEvent = [...events].reverse().find((event) => event.type === 'TASK_STATE' && typeof event.payload?.state === 'string');
  if (!stateEvent || !task) return task;
  const taskUpdated = Date.parse(task.updated_at || task.updatedAt || '') || 0;
  const eventCreated = Date.parse(stateEvent.createdAt || '') || 0;
  return eventCreated >= taskUpdated ? { ...task, state: stateEvent.payload.state } : task;
}
