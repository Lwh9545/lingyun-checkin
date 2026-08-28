<template>
  <div class="reimbursement-page">
    <!-- 骨架屏：独立 viewLoading，首屏渲染/导出刷新期间展示 -->
    <div v-if="viewLoading" class="skeleton-grid" aria-busy="true" aria-label="加载中">
      <div class="skeleton skeleton-line short"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-card"></div>
      <div class="skeleton skeleton-line mid"></div>
      <div class="skeleton skeleton-line"></div>
    </div>

    <template v-else>
    <!-- 标题 + 月份切换（与 Dashboard/Salary 同款日历选择器） -->
    <div class="dash-header fade-in-up">
      <h1 class="dash-title">费用报销</h1>
      <button class="month-picker-btn" @click="showMonthPicker = !showMonthPicker">
        <svg class="picker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{{ selectedYear }}年{{ selectedMonth }}月</span>
        <svg class="picker-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    </div>

    <!-- 月份选择器弹窗（与 Dashboard/Salary 完全同款 CSS 类） -->
    <div v-if="showMonthPicker" class="month-picker-overlay" @click.self="showMonthPicker = false">
      <div class="month-picker">
        <div class="picker-header">
          <button class="picker-btn" @click="decreaseYear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="picker-year">{{ pickerYear }}年</span>
          <button class="picker-btn" @click="increaseYear">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div class="picker-months">
          <button
            v-for="month in 12"
            :key="month"
            class="month-item"
            :class="{ active: pickerYear === selectedYear && month === selectedMonth }"
            @click="selectMonth(month)"
          >
            {{ month }}月
          </button>
        </div>
      </div>
    </div>

    <!-- 新增一笔表单卡片（打工人随手记） -->
    <div class="form-card fade-in-up">
      <span class="form-card-label">记一笔</span>
      <div class="form-grid">
        <div class="form-cell">
          <label class="form-label">日期</label>
          <input
            v-model="form.date"
            class="form-input"
            type="date"
            :max="today"
          >
        </div>
        <div class="form-cell">
          <label class="form-label">类型</label>
          <select v-model="form.category" class="form-input">
            <option v-for="c in CATEGORY_ORDER" :key="c" :value="c">
              {{ CATEGORY_META[c].label }}
            </option>
          </select>
        </div>
        <div class="form-cell">
          <label class="form-label">金额</label>
          <div class="amount-wrap">
            <span class="amount-symbol">¥</span>
            <input
              v-model="form.amountYuan"
              class="form-input amount-input"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="如 30"
              @keydown.enter="$event.target.blur()"
            >
          </div>
        </div>
        <div class="form-cell form-cell-wide">
          <label class="form-label">备注</label>
          <input
            v-model="form.remark"
            class="form-input"
            type="text"
            maxlength="50"
            placeholder="选填，如：加班外卖、打车去客户公司"
            @keydown.enter="$event.target.blur()"
          >
        </div>
      </div>
      <button class="add-btn" @click="addRecord">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        添加
      </button>
    </div>

    <!-- 3 张统计卡片（严格 4 色系：primary/success/warning） -->
    <div class="stats-grid">
      <StatCard label="总笔数" :value="`${currentRecords.length} 笔`" color="primary" />
      <StatCard label="本月合计" :value="formatYuan(totalAmount)" color="success" />
      <StatCard
        label="最多类目"
        :value="topCatText"
        color="warning"
      />
    </div>

    <!-- 导出操作 -->
    <div class="export-row">
      <button
        class="btn-export-primary"
        :disabled="!currentRecords.length"
        @click="exportReimbursementSheet"
      >
        导出 {{ selectedMonth }} 月报销单
      </button>
    </div>

    <!-- 报销明细 -->
    <div class="detail-card fade-in-up">
      <div class="detail-header">
        <span class="detail-title">报销明细</span>
        <span class="detail-count">{{ currentRecords.length }} 笔</span>
      </div>
      <table v-if="currentRecords.length" class="detail-table">
        <thead>
          <tr>
            <th>日期</th>
            <th>类型</th>
            <th class="num">金额</th>
            <th>备注</th>
            <th class="op-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in currentRecords" :key="r.id">
            <td>{{ r.date.slice(5).replace('-', '/') }}</td>
            <td>
              <span class="kind-tag" :class="`kind-${r.category}`">
                {{ CATEGORY_META[r.category]?.label || r.category }}
              </span>
            </td>
            <td class="num pay-cell">{{ formatYuan(r.amountCents) }}</td>
            <td class="remark-cell">{{ r.remark || '--' }}</td>
            <td class="op-col">
              <button class="delete-btn" title="删除" aria-label="删除报销" @click="removeRecord(r)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        <span>本月暂无报销记录</span>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  yuanToCents,
  formatYuan,
  sanitizeRemark,
  genId,
  totalCents,
  topCategory,
  monthRecords,
} from '../utils/reimbursementUtils'
import { buildReimbursementRows, buildReimbursementSummaryRows, REIMBURSEMENT_COL_WIDTHS, exportWorkbook } from '../utils/exportUtils'
import { STORAGE_KEYS } from '../utils/constants'
import { getStorage, setStorage } from '../utils/storageUtils'
import { getTodayString } from '../utils/dateUtils'
import { createLogger } from '../utils/logger'
import { useToast } from '../composables/useToast'
import { useEscapeClose } from '../composables/useEscapeClose'
import StatCard from '../components/StatCard.vue'

const log = createLogger('reimbursement-view')
const toast = useToast()

/** 视图级加载态（本视图无 attendanceStore，独立控制骨架屏） */
const viewLoading = ref(true)
onMounted(() => {
  // 首屏渲染完成后关闭骨架屏，导出等耗时场景可按需重新置 true
  const t = setTimeout(() => { viewLoading.value = false; clearTimeout(t) }, 0)
})

const now = new Date()
const currentYear = now.getFullYear()
const today = getTodayString()

// 月选择器（与 Salary/Dashboard 完全同语义）
const selectedYear = ref(Number(today.slice(0, 4)))
const selectedMonth = ref(Number(today.slice(5, 7)))
const showMonthPicker = ref(false)
useEscapeClose(showMonthPicker, () => { showMonthPicker.value = false })
const pickerYear = ref(Number(today.slice(0, 4)))

function selectMonth(month) {
  selectedMonth.value = month
  selectedYear.value = pickerYear.value
  showMonthPicker.value = false
}
function increaseYear() {
  if (pickerYear.value < currentYear) pickerYear.value++
}
function decreaseYear() {
  if (pickerYear.value > currentYear - 1) pickerYear.value--
}

// ── 新增表单：日期默认今日，类型默认 food（打工人最常记），金额空待填 ──
const form = reactive({
  date: today,
  category: 'food',
  amountYuan: '',
  remark: '',
})

// 全量报销记录（从存储异步加载后写入此 ref）
const allRecords = ref([])

// 按当前月份过滤 + 日期升序
const currentRecords = computed(() =>
  monthRecords(allRecords.value, selectedYear.value, selectedMonth.value)
)

// 合计金额（分）→ 整数相加永不丢精度
const totalAmount = computed(() => totalCents(currentRecords.value))

// Top 分类文案
const topCatText = computed(() => {
  const t = topCategory(currentRecords.value)
  if (!t) return '--'
  const label = CATEGORY_META[t.category]?.label || t.category
  return `${label} ${t.count}笔`
})

// ── CRUD：加载 / 新增 / 删除 ──
async function loadRecords() {
  const saved = await getStorage(STORAGE_KEYS.REIMBURSEMENT_RECORDS, [])
  allRecords.value = Array.isArray(saved) ? saved : []
}

async function persistAll() {
  await setStorage(STORAGE_KEYS.REIMBURSEMENT_RECORDS, allRecords.value)
}

/** 添加一笔：表单校验（金额必填正数）→ 分存储 → 成功 toast 含金额 */
async function addRecord() {
  const rawYuan = String(form.amountYuan || '').trim()
  if (rawYuan === '') {
    toast.warning('请填写报销金额')
    return
  }
  const yuan = Number(rawYuan)
  if (!(Number.isFinite(yuan) && yuan > 0)) {
    toast.warning('金额必须是正数')
    return
  }
  const cents = yuanToCents(yuan)  // ✅ 存分整数，浮点无忧
  const newRec = {
    id: genId(),
    date: form.date || today,
    category: CATEGORY_META[form.category] ? form.category : 'other',
    amountCents: cents,
    remark: sanitizeRemark(form.remark),
    createdAt: Date.now(),
  }
  allRecords.value.push(newRec)
  await persistAll()
  // 重置表单：日期保持当前（可能改了月连续记），类型保留，金额和备注清空
  form.amountYuan = ''
  form.remark = ''
  toast.success(`${CATEGORY_META[newRec.category].label} ${formatYuan(cents)} 已添加`)
}

/** 删除一笔：二次确认 → 确认后删除 → toast 成功（FMEA F2 防御） */
async function removeRecord(r) {
  const cat = CATEGORY_META[r.category]?.label || r.category
  const ok = window.confirm(`确定删除 ${r.date.slice(5).replace('-','/')} ${cat} ${formatYuan(r.amountCents)} 吗？\n删除后可通过"设置 → 数据备份"恢复历史备份。`)
  if (!ok) return
  allRecords.value = allRecords.value.filter(x => x.id !== r.id)
  await persistAll()
  toast.success('已删除该笔报销')
}

// ── 导出 Excel 报销单（明细 + 汇总双 sheet，与工资对账单一目了然） ──
async function exportReimbursementSheet() {
  if (!currentRecords.value.length) return
  const monthStr = `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}`
  const filename = `报销单_${monthStr}.xlsx`
  try {
    await exportWorkbook([
      { name: '报销明细', rows: buildReimbursementRows(currentRecords.value), colWidths: REIMBURSEMENT_COL_WIDTHS },
      {
        name: '汇总',
        rows: buildReimbursementSummaryRows(currentRecords.value, selectedYear.value, selectedMonth.value),
        colWidths: [{ wch: 12 }, { wch: 8 }, { wch: 16 }]
      }
    ], filename)
    toast.success(`报销单已导出：${filename}`)
  } catch (e) {
    log.error('[reimbursement] 导出报销单失败:', e)
    toast.error('导出报销单失败：' + (e?.message || '未知错误'))
  }
}

onMounted(async () => {
  await loadRecords()
})
</script>

<style scoped>
.reimbursement-page {
  padding: var(--space-lg);
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.dash-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.dash-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

/* ═══════════════════════════════════
   月份选择器（与 Salary/Dashboard 完全同款 CSS 类，保证视觉锚点一致）
   ═══════════════════════════════════ */
.month-picker-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--color-text-primary);
  font-size: 14px;
  font-weight: 600;
}
.month-picker-btn:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-light);
}
.picker-icon { width: 16px; height: 16px; color: var(--color-text-tertiary); }
.picker-arrow { width: 14px; height: 14px; color: var(--color-text-tertiary); transition: transform 0.2s ease; }
.month-picker-btn:hover .picker-arrow { transform: rotate(180deg); }

.month-picker-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--color-bg-mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.month-picker {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 20px;
  min-width: 280px;
  animation: slideUp 0.2s ease;
}
@keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}
.picker-btn {
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  width: var(--touch-min);
  height: var(--touch-min);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--color-bg-secondary);
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s ease;
}
.picker-btn:hover { background: var(--color-border-light); }
.picker-btn svg { width: 16px; height: 16px; }
.picker-year { font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
.picker-months {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.month-item {
  padding: 10px;
  border: none;
  background: var(--color-bg-secondary);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
.month-item:hover { background: var(--color-primary-bg); color: var(--color-primary); }
.month-item.active { background: var(--color-primary); color: var(--color-white); }

/* ═══════════════════════════════════
   新增表单卡片（打工人随手记 4 字段）
   ═══════════════════════════════════ */
.form-card {
  display: flex;
  align-items: stretch;
  gap: var(--space-md);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-md) var(--space-lg);
  box-shadow: var(--shadow-card);
}
.form-card-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  align-self: center;
  flex-shrink: 0;
  width: 48px;
}
.form-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-sm) var(--space-md);
}
.form-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.form-cell-wide { grid-column: span 1; }
.form-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  padding-left: 2px;
}
.form-input {
  width: 100%;
  box-sizing: border-box;
  padding: 7px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}
.form-input:focus { border-color: var(--color-primary); }
.amount-wrap {
  display: flex; align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0 10px;
  background: var(--color-bg-secondary);
  transition: border-color 0.15s;
}
.amount-wrap:focus-within { border-color: var(--color-primary); }
.amount-symbol { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); }
.amount-input {
  border: none; outline: none; background: transparent;
  padding: 7px 0 7px 4px;
  font-size: 13px; color: var(--color-text-primary);
  flex: 1; min-width: 0;
}
.amount-input::-webkit-outer-spin-button,
.amount-input::-webkit-inner-spin-button { -webkit-appearance: none; }

.add-btn {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-white);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.add-btn:hover { background: var(--color-primary-dark); transform: translateY(-1px); }
.add-btn svg { width: 14px; height: 14px; }

/* ═══════════════════════════════════
   Hero 合计卡（与工资 pay-hero 同尺寸渐变）
   ═══════════════════════════════════ */
.hero-card {
  display: flex;
  align-items: baseline;
  gap: var(--space-md);
  background: linear-gradient(135deg, var(--color-primary), var(--color-purple));
  border-radius: var(--radius-lg);
  padding: var(--space-lg) var(--space-xl);
  color: var(--color-white);
  box-shadow: var(--shadow-glow);
}
.hero-label { font-size: 14px; opacity: 0.9; }
.hero-value { font-size: 34px; font-weight: 700; font-variant-numeric: tabular-nums; }
.hero-hint { font-size: 12px; opacity: 0.75; margin-left: auto; }

/* 统计卡 3 列 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

/* ═══════════════════════════════════
   明细卡 + 导出按钮（与 Salary.detail-card 100% 同 CSS）
   ═══════════════════════════════════ */
.detail-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
}
.detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md); }
.detail-actions { display: flex; align-items: center; gap: var(--space-sm); }
.export-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  padding: 5px 12px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.export-btn:hover:not(:disabled) { background: var(--color-primary); color: var(--color-white); }
.export-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.export-btn svg { width: 13px; height: 13px; }
.detail-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
.detail-count { font-size: 12px; color: var(--color-text-tertiary); }

.detail-table { width: 100%; border-collapse: collapse; }
.detail-table th {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  text-align: left;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-divider);
}
.detail-table td {
  font-size: 13px;
  color: var(--color-text-primary);
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-divider);
  vertical-align: middle;
}
.detail-table tbody tr:last-child td { border-bottom: none; }
.detail-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.pay-cell { font-weight: 600; }
.remark-cell {
  color: var(--color-text-secondary);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.op-col {
  width: 40px;
  text-align: center !important;
}
.delete-btn {
  background: transparent;
  border: none;
  padding: 4px;
  min-width: var(--touch-min);
  min-height: var(--touch-min);
  border-radius: var(--radius-md);
  color: var(--color-text-tertiary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.delete-btn:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}
.delete-btn svg { width: 15px; height: 15px; }

/* 分类标签：严格 4 色系（primary/success/warning/danger，和 CATEGORY_META.color 一一对应）*/
.kind-tag { display: inline-block; font-size: 12px; padding: 2px 8px; border-radius: var(--radius-full); }
.kind-transport,
.kind-hotel,
.kind-office,
.kind-phone {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}
.kind-fuel,
.kind-toll {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.kind-food,
.kind-other {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.kind-parking {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}

/* 空态三段式（与 Salary 完全同 CSS） */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--space-2xl) var(--space-lg);
}
.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--color-text-placeholder);
  margin-bottom: 8px;
}
.empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}
.empty-sub {
  font-size: 12px;
  color: var(--color-text-tertiary);
}

/* 导出按钮操作行（与 Salary 页同尺寸） */
.export-row {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0 8px;
}
.btn-export-primary {
  height: 42px;
  padding: 0 24px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  color: var(--color-white);
  font-size: 14px;
  font-weight: 600;
  border-radius: var(--radius-lg);
  box-shadow: var(--color-primary-glow);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.btn-export-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px var(--color-primary-glow);
}
.btn-export-primary:active:not(:disabled) {
  transform: translateY(0);
}
.btn-export-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

/* 入场动画 */
.fade-in-up { animation: fadeInUp 0.35s ease both; }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 窄屏（< 640px）自适应：表单 2 列 */
@media (max-width: 640px) {
  .form-card { flex-direction: column; }
  .form-card-label { width: auto; align-self: flex-start; }
  .form-grid { grid-template-columns: repeat(2, 1fr); }
  .form-cell-wide { grid-column: span 2; }
  .add-btn { align-self: stretch; justify-content: center; }
}
</style>
