<template>
  <div class="stat-card glass-card-strong" :class="[colorClass, { warn: warn }]">
    <span class="stat-label">{{ label }}</span>
    <div class="stat-body">
      <span class="stat-value">{{ formattedValue }}</span>
      <span class="stat-unit">{{ unit }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  unit: { type: String, default: '' },
  color: { type: String, default: 'primary' },
  warn: { type: Boolean, default: false }
})

const formattedValue = computed(() => {
  const v = props.value
  if (v === null || v === undefined) return '--'
  if (typeof v === 'number' && isNaN(v)) return '--'
  return String(v)
})

const colorClass = computed(() => `card-${props.color}`)
</script>

<style scoped>
.stat-card {
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  transition: all var(--transition-base);
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}
.stat-label {
  font-size: 12px;
  color: var(--color-text-tertiary);
  font-weight: 500;
}
.stat-body {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -1px;
  line-height: 1;
}
.stat-unit {
  font-size: 13px;
  color: var(--color-text-tertiary);
  font-weight: 400;
}

/* 颜色变体 */
.card-primary .stat-value { color: var(--color-primary); }
.card-success .stat-value { color: var(--color-success); }
.card-warning .stat-value { color: var(--color-warning); }
.card-danger .stat-value { color: var(--color-danger); }

.card-warning.warn {
  background: var(--color-warning-bg);
  border-color: var(--color-warning-light);
}
.card-danger.warn {
  background: var(--color-danger-bg);
  border-color: var(--color-danger-light);
}
</style>
