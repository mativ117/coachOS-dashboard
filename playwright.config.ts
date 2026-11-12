import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  use: {
    baseURL: "http://127.0.0.1:4176/coachOS-dashboard/",
    launchOptions: { executablePath: process.env.CHROMIUM_PATH },
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "model-storage", testMatch: /(?:model|storage)\.spec\.ts/ },
    {
      name: "desktop",
      testIgnore: /(?:model|storage)\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      testIgnore: /(?:model|storage)\.spec\.ts/,
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run preview -- --port 4176",
    url: "http://127.0.0.1:4176/coachOS-dashboard/",
    reuseExistingServer: !process.env.CI,
  },
});
