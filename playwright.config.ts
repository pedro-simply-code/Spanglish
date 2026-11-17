import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a running app with a freshly seeded database:
 *   pnpm db:reset && pnpm db:migrate && pnpm db:seed
 *   pnpm admin:promote -- <E2E_ADMIN_EMAIL> --yes
 *   pnpm build && pnpm start         (or pnpm dev)
 *   E2E_ADMIN_EMAIL=<admin email> pnpm test:e2e
 * Never point this at production: the tests create and approve data.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "en-US",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
