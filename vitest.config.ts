import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: { APP_ENV: "local", TEST_MIGRATIONS: await readD1Migrations("./migrations") },
      },
    })),
  ],
  test: {
    include: ["test/**/*.test.ts"],
    setupFiles: ["./test/apply-migrations.ts"],
    // The Cloudflare D1/Miniflare fixture is shared by the test workers.
    // Serializing files prevents resource contention from turning an
    // otherwise deterministic state-machine assertion into a 5s timeout.
    fileParallelism: false,
  },
});
