# 灵韵打卡 · 设计统一标准 v1.0

> 本文档是全应用 UI 的唯一标准。改任何页面样式前先对照本文档；新增样式必须使用 token。
> Token 定义于 `src/styles/main.css`（亮色 `:root` + 暗色 `.dark` 双主题，改色值两段必须同步）。

## 1. 字号阶梯（唯一入口，禁止写 px 字面量）

| Token | 值 | 用途 |
|---|---|---|
| `--text-display` | 40px | 打卡页时间数字（唯一） |
| `--text-3xl` | 28px | KPI 巨型数字（唯一） |
| `--text-2xl-plus` | **24px** | **页面主标题 h1（dash-title）** |
| `--text-2xl` | 22px | 页面副标题 / 二级大标题 |
| `--text-xl-plus` | **20px** | **面板标题（panel-title，Tab 内页头）** |
| `--text-xl` | 18px | 卡片标题 |
| `--text-lg-plus` / `--text-lg` | 17 / 16px | 小标题 |
| `--text-md` | **15px** | **区块标题（detail-title / all-title）** |
| `--text-base` / `--text-base-sm` | 14 / 13px | 正文 / 次要正文 |
| `--text-sm` / `--text-xs` | 12 / 11px | 辅助 / 极小辅助 |

**规则**：所有 `font-size` 必须引用上表 token；标题字重：h1=700、区块标题=600、正文=400~500。

## 2. 页头模板（所有页面对齐方向统一）

标准页头 = **标题靠左 + 操作控件靠右 + 垂直居中**：

```html
<div class="dash-header">
  <h1 class="dash-title">页面名</h1>
  <Tab 切换 / 月选择器 / 操作按钮>  <!-- margin-left: auto 靠右 -->
</div>
```

- Dashboard 与 Finance 已是标准实现，新增页面照抄该结构。
- 标题永远靠左；月份选择器/操作按钮永远靠右；禁止居中页头、禁止标题右侧出现说明文字换行。
- Finance 内 Tab 面板的 panel-header 只有标题（月份由 Finance 头部统一提供），面板内不得再出现第二个月份选择器。

## 3. 颜色（禁止硬编码 hex/rgb）

- 语义色一律 `var(--color-*)`：success / warning / danger / info 各有 `-light` `-bg` `-strong` 变体。
- 本库新增 `--color-success-strong`（亮 #059669 / 暗 #a7f3d0），渐变端点用 token。
- **允许的例外（一次性装饰渐变，需注释标注）**：
  - `Checkin.vue` 禁用按钮 slate 灰阶渐变（禁用态专用）
  - `Checkin.vue` auto-success 渐变首端 `#34d399`
  - `Dashboard.vue` L821/L839、`Cloud.vue` L955/L963/L971 装饰卡背景渐变
- 新增例外必须在本节登记；未登记的 hex 出现即视为违规（`npm run check:dead` 之后接 `grep -rn "#[0-9a-f]" src --include="*.vue"` 抽查）。

## 4. 按钮体系

| 层级 | 类名参考 | 规格 |
|---|---|---|
| 主操作 | `btn-export-primary` / `btn-confirm` | 高 42~44px、`--radius-lg`、primary 渐变、600 |
| 次操作 | `add-btn` / `finance-tab-btn` | 高 36~40px、`--radius-sm~md`、实色 |
| 轻操作 | `mini-btn` / `link-btn` / chip 类 | 高 28~32px、圆角 chip |
| 禁用 | `opacity 0.45 + not-allowed`，禁用灰渐变仅打卡按钮 | |

- 所有可点目标 `min-height/min-width: var(--touch-min)`（≥44px 或含内边距达标）。
- 图标按钮必须带 `aria-label`。

## 5. 间距与圆角

- 间距只用 `--space-xs/sm/md/lg/xl/2xl`（4/8/16/24/32/48）；组件内部微调允许 4 的倍数 px 并注释。
- 圆角：`--radius-sm`(8) 输入框 / `--radius-md`(12) 小卡与按钮 / `--radius-lg`(16) 大卡 / `--radius-xl`(20) 弹窗 / `--radius-full` 标签。同层级元素圆角必须一致。

## 6. 性能与内存约定

- **常驻定时器必须响应 Page Visibility**：窗口隐藏时暂停（参考 `Checkin.vue` 的 `startClock/stopClock`）。自动打卡引擎（App.vue `autoCheckTimer`）是核心功能例外，不得暂停。
- 重依赖（exceljs）必须懒加载（路由级 dynamic import），不得进首屏 chunk。
- 新增每秒级任务前必须论证可见性策略。

## 7. 新页面自查清单

- [ ] h1 用 `--text-2xl-plus`，页头结构照抄 dash-header
- [ ] 无硬编码 hex（或已在 §3 登记例外）
- [ ] font-size 全部 token 化
- [ ] 按钮层级与规格符合 §4
- [ ] 间距/圆角用 token
- [ ] 常驻定时器有可见性暂停
- [ ] 亮/暗双主题各截一屏验证
