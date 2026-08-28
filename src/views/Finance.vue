<template>
  <div class="finance-page">
    <!-- 标题 + Tab 切换 + 共享月份选择器（一份选择器管两个面板） -->
    <div class="dash-header fade-in-up">
      <h1 class="dash-title">财务</h1>
      <div class="finance-tabs" role="tablist" aria-label="财务功能切换">
        <button
          class="finance-tab-btn"
          role="tab"
          :class="{ active: activeTab === 'salary' }"
          :aria-selected="activeTab === 'salary'"
          @click="activeTab = 'salary'"
        >工资核对</button>
        <button
          class="finance-tab-btn"
          role="tab"
          :class="{ active: activeTab === 'reimbursement' }"
          :aria-selected="activeTab === 'reimbursement'"
          @click="activeTab = 'reimbursement'"
        >费用报销</button>
      </div>
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

    <!-- 月份选择器弹窗（唯一实例，状态提升自 Salary/Reimbursement） -->
    <div v-if="showMonthPicker" class="month-picker-overlay" @click.self="showMonthPicker = false">
      <div class="month-picker">
        <div class="picker-header">
          <button class="picker-btn" @click="decreaseYear" aria-label="上一年">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span class="picker-year">{{ pickerYear }}年</span>
          <button class="picker-btn" @click="increaseYear" aria-label="下一年">
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

    <!-- 面板：keep-alive 保留各自状态（表单/滚动位置） -->
    <keep-alive>
      <component :is="activeComp" :year="selectedYear" :month="selectedMonth" />
    </keep-alive>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useEscapeClose } from '../composables/useEscapeClose'
import { getTodayString } from '../utils/dateUtils'
import SalaryPanel from './finance/SalaryPanel.vue'
import ReimbursementPanel from './finance/ReimbursementPanel.vue'

const today = getTodayString()
const currentYear = new Date().getFullYear()

const activeTab = ref('salary')
const activeComp = computed(() => (activeTab.value === 'salary' ? SalaryPanel : ReimbursementPanel))

// ── 共享月份选择器（与 Dashboard 同语义，年限制 2020~当前年） ──
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
</script>

<style scoped>
.finance-page {
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
  gap: 12px;
  flex-wrap: wrap;
}

.dash-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

/* Tab 切换（与打卡页/记录页 pill 风格一致） */
.finance-tabs {
  display: inline-flex;
  background: var(--color-border-light);
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 4px;
  margin-left: auto;
}
.finance-tab-btn {
  padding: 8px 18px;
  min-height: var(--touch-min);
  border: none;
  border-radius: calc(var(--radius-md) - 2px);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.finance-tab-btn:hover:not(.active) { color: var(--color-text-primary); }
.finance-tab-btn.active {
  background: var(--color-bg-card);
  color: var(--color-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  font-weight: 600;
}

/* ── 月份选择器（与 Dashboard 同款，保持一致视觉锚点） ── */
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

/* 入场动画（与全局一致） */
.fade-in-up {
  animation: fadeInUp 0.35s ease both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 窄屏自适应：Tab 与月份按钮换行 */
@media (max-width: 640px) {
  .dash-header { flex-wrap: wrap; }
  .finance-tabs { order: 3; width: 100%; justify-content: center; margin-left: 0; }
}
</style>
