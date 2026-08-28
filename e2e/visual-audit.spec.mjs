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
    await page.waitForTimeout(1200) // 等骨架屏/字体稳定
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
