<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast-item"
        :class="t.type"
        @click="dismiss(t.id)"
      >
        <span class="toast-icon">{{ iconMap[t.type] }}</span>
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const toasts = ref([])
let _id = 0

const iconMap = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
}

function show(message, type = 'info', duration = 3000) {
  const id = ++_id
  toasts.value.push({ id, message, type })
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration)
  }
  return id
}

function dismiss(id) {
  const idx = toasts.value.findIndex(t => t.id === id)
  if (idx >= 0) toasts.value.splice(idx, 1)
}

// ── 暴露给外部（通过 provide / 全局属性） ──
if (typeof window !== 'undefined') {
  window.__toast = { show, dismiss }
}

onMounted(() => {
  window.__toast = { show, dismiss }
})

onUnmounted(() => {
  if (window.__toast?.show === show) {
    delete window.__toast
  }
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 72px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
  max-width: calc(100vw - 40px);
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.06);
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
  pointer-events: auto;
  white-space: nowrap;
  border: 1px solid rgba(226, 232, 240, 0.6);
}

.toast-item.success { border-left: 3px solid var(--color-success); }
.toast-item.error   { border-left: 3px solid var(--color-danger); }
.toast-item.warning { border-left: 3px solid var(--color-warning); }
.toast-item.info    { border-left: 3px solid var(--color-primary); }

.toast-icon { font-size: 16px; flex-shrink: 0; }
.toast-msg  { flex: 1; }

/* ── 动画 ── */
.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: all 0.25s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.94);
}
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}
</style>
