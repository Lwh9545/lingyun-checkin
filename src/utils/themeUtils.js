// 主题跟随系统（体验层）：项目已有 [data-theme="dark"] 变量体系，此处只做系统监听与切换
// 契约测试: tests/experience.test.js

/** 系统 prefers-dark → 'dark' | 'light'（非法输入回退 light） */
export function resolveTheme(prefersDark) {
  return prefersDark === true ? 'dark' : 'light'
}

/**
 * 监听系统深浅色变化并立即回调当前主题。
 * @param {MediaQueryList|Object} mql 可注入以便测试
 * @param {(theme: string) => void} onChange
 * @returns {() => void} 解绑函数
 */
export function watchSystemTheme(mql, onChange) {
  if (!mql || typeof mql.addEventListener !== 'function') {
    onChange(resolveTheme(false))
    return () => {}
  }
  const handler = () => onChange(resolveTheme(mql.matches))
  handler() // 立即应用当前状态
  mql.addEventListener('change', handler)
  return () => mql.removeEventListener('change', handler)
}
