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
    <!-- 面板标题（月份由 Finance 头部统一切换） -->
    <div class="panel-header fade-in-up">
      <h1 class="panel-title">费用报销</h1>
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
        导出 {{ month }} 月报销单
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
} from '../../utils/reimbursementUtils'
import { buildReimbursementRows, buildReimbursementSummaryRows, REIMBURSEMENT_COL_WIDTHS, exportWorkbook } from '../../utils/exportUtils'
import { STORAGE_KEYS } from '../../utils/constants'
import { getStorage, setStorage } from '../../utils/storageUtils'
import { getTodayString } from '../../utils/dateUtils'
import { createLogger } from '../../utils/logger'
import { useToast } from '../../composables/useToast'
import StatCard from '../../components/StatCard.vue'

const props = defineProps({
  year: { type: Number, required: true },
  month: { type: Number, required: true }
})

const log = createLogger('reimbursement-panel')
const toast = useToast()

/** 视图级加载态（本面板无 attendanceStore，独立控制骨架屏） */
const viewLoading = ref(true)
onMounted(() => {
  // 首屏渲染完成后关闭骨架屏，导出等耗时场景可按需重新置 true
  const t = setTimeout(() => { viewLoading.value = false; clearTimeout(t) }, 0)
})

const today = getTodayString()

// 月份由 Finance 头部统一提供
const selectedYear = computed(() => props.year)
const selectedMonth = computed(() => props.month)

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

// ── 导出 Excel 报销单（明细 + 汇总双 sheet） ──
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
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.panel-header { display: flex; align-items: center; }
.panel-title {
  font-size: var(--text-xl-plus);
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

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

/* 统计卡 3 列 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-md);
}

/* ═══════════════════════════════════
   明细卡 + 导出按钮
   ═══════════════════════════════════ */
.detail-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-card);
}
.detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md); }
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

/* 空态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: var(--space-2xl) var(--space-lg);
}

/* 导出按钮操作行 */
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
