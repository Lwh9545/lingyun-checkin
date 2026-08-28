// Playwright 配置：Electron E2E（不启动 webServer，测试内自起 electron）
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.mjs',  // 跑前清残留 electron 实例（单实例锁会让 launch 即死）
  timeout: 60000,
  retries: 0,
  workers: 1,          // Electron 应用全局单实例锁（lockfile），必须串行
  reporter: [['list']],
  use: {
    trace: 'off',
  },
})
