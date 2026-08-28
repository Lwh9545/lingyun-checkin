/**
 * useEscapeClose — Escape 键关闭弹层
 * 与 @click.self 点遮罩关闭互补，键盘用户不依赖鼠标
 *
 * @param {import('vue').Ref<boolean>} visible 弹层开关 ref
 * @param {() => void} close 关闭动作
 */
import { onMounted, onUnmounted } from 'vue'

export function useEscapeClose(visible, close) {
  function handler(e) {
    if (e.key === 'Escape' && visible.value) close()
  }
  onMounted(() => window.addEventListener('keydown', handler))
  onUnmounted(() => window.removeEventListener('keydown', handler))
}
