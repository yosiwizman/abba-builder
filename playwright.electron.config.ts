import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./ui-electron-tests",
  timeout: 120_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html"], ["line"]],
});
