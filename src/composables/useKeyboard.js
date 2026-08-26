/**
 * useKeyboard — 全局键盘快捷键
 * 
 * 快捷键：
 *   Ctrl+Shift+I  → 上班打卡
 *   Ctrl+Shift+O  → 下班打卡
 *   Ctrl+,        → 打开设置
 */

import { onMounted, onUnmounted } from 'vue'

const BINDINGS = [
  { key: 'i', ctrl: true, shift: true, action: 'check-in',  label: 'Ctrl+Shift+I' },
  { key: 'o', ctrl: true, shift: true, action: 'check-out', label: 'Ctrl+Shift+O' },
  { key: ',', ctrl: true, shift: false, action: 'settings', label: 'Ctrl+,' },
]

export function useKeyboard(callbacks) {
  function handler(e) {
    // 忽略输入框中的快捷键
    const tag = document.activeElement?.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable) {
      return
    }

    for (const b of BINDINGS) {
      const ctrlOk = b.ctrl ? (e.ctrlKey || e.metaKey) : true
      const shiftOk = b.shift ? e.shiftKey : !e.shiftKey
      if (e.key?.toLowerCase() === b.key && ctrlOk && shiftOk) {
        e.preventDefault()
        const fn = callbacks?.[b.action]
        if (typeof fn === 'function') fn()
        return
      }
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))

  return { shortcuts: BINDINGS }
}
