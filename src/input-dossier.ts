/** Never expose raw CAD coordinate lengths to a model when their physical unit is unknown. */
export function formatCadBBoxForPrompt(size: unknown, unitStatus: string): string {
  return unitStatus === "CONFIRMED" ? JSON.stringify(size ?? null) : "[omitted: source units unconfirmed]";
}
