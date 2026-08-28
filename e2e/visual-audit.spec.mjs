// 视觉取证 spec（铁律 9）：逐页截屏供设计一致性人工/模型审计
// 产物：evidence/design-audit/<页面>-<主题>.png
import { test, _electron as electron } from '@playwright/test'
import path from 'node:path'
import fs from 'node:fs'

const OUT = path.join(process.cwd(), 'evidence', 'design-audit')

async function launchApp() {
  return electron.launch({ args: ['.'], cwd: process.cwd() })
}
function isMain(win) {
  return !win.url().startsWith('devtools://')
}

const PAGES = [
  { name: '01-checkin', nav: null },                    // 默认页
  { name: '02-dashboard', nav: '仪表盘' },
  { name: '03-finance-salary', nav: '财务' },
  { name: '04-finance-reimb', nav: '财务', tab: '.finance-tab-btn:has-text("费用报销")' },
  { name: '05-settings', nav: '设置' },
  { name: '06-cloud', nav: '网盘' },
]

test.describe('视觉取证：逐页截图', () => {
  let app, page

  test.beforeEach(async () => {
    app = await launchApp()
    page = await app.waitForEvent('window', { predicate: isMain }).catch(() => null)
      || app.windows().find(isMain) || await app.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    // 大视口（贴近用户真实窗口）：窄视口下 flex-wrap 掩盖的布局问题在大窗下才暴露
    // Electron 下 setViewportSize 无效，须 resize 原生 BrowserWindow
    await app.evaluate(({ BrowserWindow }, size) => {
      const win = BrowserWindow.getAllWindows().find(w => !w.getURL().startsWith('devtools://'))
      win?.setSize(size.w, size.h)
    }, { w: 1440, h: 900 })
    // 等骨架屏消失（sqlite 初始化在 E2E 下较慢，固定 sleep 会截到骨架）
    await page.waitForSelector('.skeleton-grid', { state: 'detached', timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(400) // 字体/动画稳定
    fs.mkdirSync(OUT, { recursive: true })
  })

  test.afterEach(async () => {
    await app.close()
  })

  for (const p of PAGES) {
    test(`截图 ${p.name}`, async () => {
      if (p.nav) {
        const nav = page.locator(`text=${p.nav}`).first()
        await nav.click()
        await page.waitForTimeout(900)
      }
      if (p.tab) {
        await page.locator(p.tab).click()
        await page.waitForTimeout(700)
      }
      await page.screenshot({ path: path.join(OUT, `${p.name}.png`) })
    })
  }
})
