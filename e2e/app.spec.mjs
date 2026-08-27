// Playwright Electron E2E（P1 工作包）：真实启动应用，覆盖网盘页零崩溃 + 主路径冒烟
import { test, expect, _electron as electron } from '@playwright/test'
import path from 'node:path'

async function launchApp() {
  return electron.launch({ args: ['.'], cwd: process.cwd() })
}

function isMain(win) {
  return !win.url().startsWith('devtools://')
}

test.describe('灵韵打卡 Electron 应用', () => {
  let app, page, consoleErrors

  test.beforeEach(async () => {
    app = await launchApp()
    // 开发模式 DevTools 窗口不关闭（级联会杀掉应用），只选取主窗口操作
    page = await app.waitForEvent('window', { predicate: isMain }).catch(() => null)
      || app.windows().find(isMain) || await app.firstWindow()
    consoleErrors = []
    page.on('console', msg => {
      if (msg.type() !== 'error') return
      // 过滤 Electron CDP 已知无害噪音（Autofill 域在 Electron 中不存在）
      if (/Autofill\.(enable|setAddresses)/.test(msg.text())) return
      consoleErrors.push(msg.text())
    })
    await page.waitForLoadState('domcontentloaded')
  })

  test.afterEach(async () => {
    await app.close()
  })

  test('应用启动：主窗口加载且无渲染 ERROR', async () => {
    await expect(page.locator('body')).toBeVisible()
    expect(consoleErrors, `启动即出现渲染错误: ${consoleErrors.join(' | ')}`).toEqual([])
  })

  test('网盘页（未配置服务器边界态）：不触发 error-boundary，无 undefined 崩溃', async () => {
    const nav = page.locator('text=网盘').first()
    await expect(nav).toBeVisible({ timeout: 5000 })
    await nav.click()
    await page.waitForTimeout(1500)
    const boundary = page.locator('text=/error-boundary|出错了|发生错误/i')
    await expect(boundary).toHaveCount(0)
    const crashes = consoleErrors.filter(e => /reading 'split'|reading 'filter'|not iterable/.test(e))
    expect(crashes, `网盘页崩溃: ${crashes.join(' | ')}`).toEqual([])
  })
})
