// Cloud composable 边界态特征测试（step2 模板：先固化行为）
// 场景：服务器未配置 —— currentPath/files 为 undefined 时组件不得崩溃（用户真实首态）
import { describe, it, expect } from 'vitest'
import { ref, computed } from 'vue'
import { activePinia, createPinia } from 'pinia'

// 复现 useCloudFiles 中三个曾崩溃的 computed 的核心逻辑（与源码同构）
function makePathParts(currentPath) {
  return computed(() => {
    if (!currentPath.value || currentPath.value === '/') return []
    return currentPath.value.split('/').filter(Boolean)
  })
}
function makeFolderCount(files) {
  return computed(() => (files.value ?? []).filter(f => f.type === 'folder').length)
}
function makeFilteredFiles(files) {
  return computed(() => {
    let result = files.value ?? []
    return [...result].sort((a, b) => (a.type === 'folder' && b.type !== 'folder') ? -1 : 0)
  })
}

describe('useCloudFiles 未配置服务器（undefined 边界态）', () => {
  it('pathParts: currentPath 为 undefined 时返回空数组，不抛 split 错误', () => {
    const parts = makePathParts(ref(undefined))
    expect(parts.value).toEqual([])
  })
  it('pathParts: currentPath 为 null / 空串 / 根路径时均返回空数组', () => {
    expect(makePathParts(ref(null)).value).toEqual([])
    expect(makePathParts(ref('')).value).toEqual([])
    expect(makePathParts(ref('/')).value).toEqual([])
  })
  it('pathParts: 正常路径继续可解析（防过度防御破坏既有行为）', () => {
    expect(makePathParts(ref('/docs/2026')).value).toEqual(['docs', '2026'])
  })
  it('folderCount: files 为 undefined 时返回 0，不抛 filter 错误', () => {
    expect(makeFolderCount(ref(undefined)).value).toBe(0)
  })
  it('filteredFiles: files 为 undefined 时不抛 not iterable，返回空数组', () => {
    expect(makeFilteredFiles(ref(undefined)).value).toEqual([])
  })
})
