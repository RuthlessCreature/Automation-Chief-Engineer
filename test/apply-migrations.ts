import { applyD1Migrations, env, type D1Migration } from "cloudflare:test";

function isMigrationList(value: unknown): value is D1Migration[] {
  return Array.isArray(value) && value.every((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const candidate = entry as { name?: unknown; queries?: unknown };
    return typeof candidate.name === "string" && Array.isArray(candidate.queries) && candidate.queries.every((query) => typeof query === "string");
  });
}

const migrations = Reflect.get(env as object, "TEST_MIGRATIONS");
if (!isMigrationList(migrations)) throw new Error("TEST_MIGRATIONS binding is invalid");
await applyD1Migrations(env.DB, migrations);
