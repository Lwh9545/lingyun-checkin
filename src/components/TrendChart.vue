<!-- 近 14 天考勤趋势图（全面升级·产品功能层）：工时柱状 + 请假类型着色标记 -->
<template>
  <div class="chart-card">
    <div class="chart-header">
      <h2 class="section-title">近 14 天工时趋势</h2>
      <span v-if="leaveCount" class="leave-badge">{{ leaveCount }} 天请假</span>
    </div>
    <canvas ref="canvasRef" height="180" aria-label="近 14 天考勤工时趋势图"></canvas>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { buildTrendData, LEAVE_TYPES } from '../utils/chartUtils'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const props = defineProps({ records: { type: Array, default: () => [] } })
const canvasRef = ref(null)
let chart = null

const leaveCount = computed(() => {
  const d = buildTrendData(props.records, 14)
  return d.leaveFlags.filter(Boolean).length
})

function render() {
  if (!canvasRef.value) return
  const d = buildTrendData(props.records, 14)
  const typeLabel = v => LEAVE_TYPES.find(t => t.value === v)?.label || '请假'
  const bg = d.leaveFlags.map(f => (f ? '#9aa7b8' : '#4f7cff'))
  chart?.destroy()
  chart = new Chart(canvasRef.value, {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{ label: '有效工时(分)', data: d.minutes, backgroundColor: bg, borderRadius: 4 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const f = d.leaveFlags[ctx.dataIndex]
              return f ? `请假（${typeLabel(f)}）` : `${Math.floor(ctx.parsed.y / 60)}小时${ctx.parsed.y % 60}分`
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { maxTicksLimit: 4, callback: v => v / 60 + 'h' }, grid: { color: '#f0f2f5' } },
        x: { ticks: { maxTicksLimit: 7, autoSkip: true }, grid: { display: false } }
      }
    }
  })
}

onMounted(render)
watch(() => props.records, render, { deep: false })
onBeforeUnmount(() => { chart?.destroy(); chart = null })
</script>

<style scoped>
.chart-card {
  background: var(--bg-card, #fff);
  border-radius: 12px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chart-header { display: flex; align-items: center; justify-content: space-between; }
.section-title { font-size: 14px; font-weight: 600; margin: 0; }
.leave-badge { font-size: 11px; color: #6b7280; background: #f3f4f6; border-radius: 8px; padding: 2px 8px; }
canvas { max-height: 180px; }
</style>
