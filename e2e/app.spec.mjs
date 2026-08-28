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

  test('工资核对器：导航渲染 + 时薪配置联动（从 Settings 保存） + 导出按钮可见', async () => {
    // ── 前置：双清时薪存储，避免上轮污染 ──
    await page.evaluate(async () => {
      try { if (window.electronAPI?.storage?.set) await window.electronAPI.storage.set('salary_hourly_wage', null) } catch (_) {}
      try { localStorage.removeItem('salary_hourly_wage') } catch (_) {}
    })

    const nav = page.locator('text=财务').first()
    await expect(nav).toBeVisible({ timeout: 5000 })
    await nav.click()
    await expect(page.locator('text=工资核对器')).toBeVisible({ timeout: 5000 })
    const boundary = page.locator('text=/error-boundary|出错了|发生错误/i')
    await expect(boundary).toHaveCount(0)

    // 月选择器（与 Dashboard 同款，Finance 头部共享实例）点击展开 + 选 3 月关闭
    const pickerBtn = page.locator('.month-picker-btn')
    await expect(pickerBtn).toBeVisible()
    await pickerBtn.click()
    await expect(page.locator('.month-picker-overlay')).toBeVisible()
    await page.locator('button.month-item >> text=3月').first().click()
    await expect(page.locator('.month-picker-overlay')).toHaveCount(0)

    // HAB3：未设置时薪 → 显示跳转提示条（虚线框 + 去设置按钮）
    await expect(page.locator('.wage-hint-bar')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.wage-hint-text')).toHaveText(/未设置时薪/)
    // 跳转到设置页
    await page.locator('.link-btn:has-text("去设置")').click()
    await expect(page.locator('.card-title:has-text("数据管理")')).toBeVisible({ timeout: 5000 })

    // 在数据管理卡第一项填入加班费时薪 50 → Enter 即 blur=save（@keyup.enter 已绑定，Electron 更可靠）
    const wageInput = page.locator('.data-card .number-input-inline input[type="number"]').first()
    await wageInput.click() // 先 focus，保证 Enter/blur 事件链完整
    await wageInput.fill('50')
    await wageInput.press('Enter')
    await page.waitForTimeout(600) // 等待 electron IPC 存盘 + Toast 渲染（500ms 够）
    await expect(page.locator('text=/加班费时薪已保存/')).toBeVisible({ timeout: 5000 })

    // 回财务页（默认落在工资核对 Tab）
    await page.locator('text=财务').first().click()
    await expect(page.locator('text=工资核对器')).toBeVisible({ timeout: 5000 })
    // 工资页应不再显示 wage-hint-bar（时薪已设置）
    await expect(page.locator('.wage-hint-bar')).toHaveCount(0)

    // HAB5：导出按钮升一级 + 文案含月份（"导出 3 月对账单"）——即使空也应渲染禁用态
    await expect(page.locator('.btn-export-primary:has-text("导出")')).toBeVisible()
    await expect(page.locator('.btn-export-primary:has-text("月对账单")')).toBeVisible()

    expect(consoleErrors, `工资页崩溃: ${consoleErrors.join(' | ')}`).toEqual([])
  })

  test('费用报销：导航渲染 + 记一笔餐饮 + 合计联动 + 删除归零', async () => {
    // ── 前置：显式重置报销记录存储，避免上轮污染（双写双清：electron 通道坏了也有 localStorage 兜底） ──
    await page.evaluate(async () => {
      try {
        if (window.electronAPI?.storage?.set) {
          await window.electronAPI.storage.set('reimbursement_records', [])
        }
      } catch (_) { /* 通道异常时忽略，localStorage 兜底已清 */ }
      try { localStorage.setItem('reimbursement_records', '[]') } catch (_) { /* noop */ }
    })

    // 1. 导航进入财务页 → 切到费用报销 Tab
    const nav = page.locator('text=财务').first()
    await expect(nav).toBeVisible({ timeout: 5000 })
    await nav.click()
    await page.locator('.finance-tab-btn:has-text("费用报销")').click()
    await expect(page.locator('text=费用报销')).toBeVisible({ timeout: 5000 })
    const boundary = page.locator('text=/error-boundary|出错了|发生错误/i')
    await expect(boundary).toHaveCount(0)

    // 2. UI5：空态简化为一句话（hero-card + 三段式已删）；本月合计 StatCard ¥0.00
    await expect(page.locator('text=本月暂无报销记录')).toBeVisible()
    // HAB5：导出按钮升一级 + 文案含月份（空时 disabled 但必须可见）
    await expect(page.locator('.btn-export-primary:has-text("导出")')).toBeVisible()
    await expect(page.locator('.btn-export-primary:has-text("月报销单")')).toBeVisible()
    // 本月合计（StatCard success 色，默认第 2 张）初始 ¥0.00
    const totalStat = page.locator('.stats-grid .card-success .stat-value').first()
    await expect(totalStat).toHaveText('¥0.00', { timeout: 5000 })
    // 总笔数 StatCard：0 笔
    await expect(page.locator('.stats-grid :text("0 笔")')).toBeVisible()

    // 3. 记一笔：餐饮 30 元 + 备注 加班外卖
    const amountInput = page.locator('.amount-input')
    const remarkInput = page.locator('.form-cell-wide input[type="text"]')
    await amountInput.fill('30')
    await remarkInput.fill('加班外卖')
    await page.locator('button:has-text("添加")').click()

    // 4. 成功 Toast 反馈（餐饮 ¥30.00 已添加）
    await expect(page.locator('text=/餐饮.*¥30.00.*已添加/')).toBeVisible({ timeout: 5000 })

    // 5. 合计 StatCard 联动变为 ¥30.00；总笔数 1 笔
    await expect(totalStat).toHaveText('¥30.00', { timeout: 3000 })
    await expect(page.locator('.stats-grid :text("1 笔")')).toBeVisible()

    // 6. 明细列表：4 字段齐全（日期 / 餐饮标签 / ¥30.00 / 加班外卖）
    const tableRows = page.locator('.detail-table tbody tr')
    await expect(tableRows).toHaveCount(1)
    await expect(tableRows.locator('.kind-food')).toHaveText('餐饮')
    await expect(tableRows.locator('.pay-cell')).toHaveText('¥30.00')
    await expect(tableRows.locator('.remark-cell')).toHaveText('加班外卖')

    // 7. HAB5：导出报销单按钮现在应该可用（记录数>0）—— 文案含某月报销单
    const exportBtn = page.locator('.btn-export-primary:has-text("月报销单")').first()
    await expect(exportBtn).not.toBeDisabled()

    // 8. 删除 → confirm OK → 合计归零，空态回来
    page.once('dialog', dialog => dialog.accept()) // 命中 window.confirm 自动点"确定"
    await tableRows.locator('.delete-btn').click()
    await expect(page.locator('text=已删除该笔报销')).toBeVisible({ timeout: 5000 })
    await expect(totalStat).toHaveText('¥0.00')
    await expect(page.locator('text=本月暂无报销记录')).toBeVisible({ timeout: 3000 })

    expect(consoleErrors, `报销页崩溃: ${consoleErrors.join(' | ')}`).toEqual([])
  })
})
