import { describe, expect, it } from "vitest";
import { createProvider } from "../src/provider";
import type { PipelineStage } from "../src/domain";

const stage: PipelineStage = {
  id: "intake",
  label: "需求接收与输入完整性",
  agent: "Intake Router",
  gate: "G00",
};

function fakeD1() {
  const marks = new Set<string>();
  return {
    prepare(sql: string) {
      let args: unknown[] = [];
      return {
        bind(...values: unknown[]) {
          args = values;
          return this;
        },
        async first<T>() {
          if (sql.startsWith("SELECT 1 AS seen")) {
            const key = `${String(args[0])}/${String(args[1])}/${String(args[2])}`;
            return (marks.has(key) ? { seen: 1 } : null) as T | null;
          }
          return null;
        },
        async run() {
          if (sql.startsWith("INSERT OR IGNORE")) marks.add(`${String(args[1])}/${String(args[2])}/${String(args[3])}`);
          return { success: true };
        },
      };
    },
  } as unknown as D1Database;
}

describe("fault-injection provider", () => {
  it("fails once and then recovers with the fixture", async () => {
    const env = {
      APP_ENV: "staging",
      DB: fakeD1(),
      FAULT_INJECTION_PROVIDER: "fixture",
      FAULT_INJECTION_SCENARIO: "MINIMAX_429_ONCE",
    } as unknown as Env;
    const provider = createProvider(env);
    await expect(provider.generateCandidate({ taskId: "task-1", prompt: "验证后台重试策略是否具备幂等性", stage })).rejects.toThrow("MINIMAX_HTTP_429");
    const candidate = await provider.generateCandidate({ taskId: "task-1", prompt: "验证后台重试策略是否具备幂等性", stage });
    expect(candidate.provider).toBe("local-contract-fixture");
  });

  it("hard-disables the fixture in production", async () => {
    const env = {
      APP_ENV: "production",
      DB: fakeD1(),
      FAULT_INJECTION_PROVIDER: "fixture",
      FAULT_INJECTION_SCENARIO: "MINIMAX_429_ALWAYS",
    } as unknown as Env;
    const provider = createProvider(env);
    expect(provider.name).toBe("minimax");
  });
});
