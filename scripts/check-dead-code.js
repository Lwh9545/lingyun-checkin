#!/usr/bin/env node
/**
 * 死组件检测（v2.1 新增机制）
 *
 * 背景：历史上 UI 重构（月视图→统计卡等）删了引用但没删文件，积累出 1020 行死组件
 * （DayView/MonthView）。本脚本把「未引用组件」检测固化为可执行门禁，进 CI 防再犯。
 *
 * 原理：扫描 src/ 全部源文件的相对 import（含 router 懒加载 import()），
 * 构建被引用集合；.vue 组件不在集合中即为死组件。
 *
 * 用法：npm run check:dead   （exit 1 = 存在死组件）
 */
const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')
const EXTS = ['.vue', '.ts', '.js']
const SKIP_DIRS = new Set(['node_modules', 'dist', 'release', '.git'])

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out)
    } else if (EXTS.some(ext => entry.name.endsWith(ext))) {
      out.push(path.join(dir, entry.name))
    }
  }
  return out
}

// 抓相对路径 import：import X from './a.vue' / import('./b.vue') / from "../x/c"
const IMPORT_RE = /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g

function resolveImport(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec)
  for (const ext of EXTS) {
    if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) return base + ext
  }
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base
  const idx = path.join(base, 'index')
  for (const ext of EXTS) {
    if (fs.existsSync(idx + ext)) return idx + ext
  }
  return null
}

const allFiles = walk(SRC)
const referenced = new Set()

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8')
  for (const m of content.matchAll(IMPORT_RE)) {
    const resolved = resolveImport(file, m[1])
    if (resolved) referenced.add(resolved)
  }
}

const components = allFiles.filter(f => f.endsWith('.vue'))
const dead = components.filter(f => !referenced.has(f))

if (dead.length === 0) {
  console.log(`check:dead ✓ ${components.length} 个组件全部被引用，无死组件`)
  process.exit(0)
}

console.error(`check:dead ✗ 发现 ${dead.length} 个未引用组件：`)
for (const f of dead) console.error('  ' + path.relative(path.dirname(SRC), f))
console.error('\n确认无动态引用后请删除，或补注解释为何保留。')
process.exit(1)
