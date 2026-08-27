'use strict'

/**
 * 构建产物 SHA256 清单生成器（step8 桌面端发布清单第 1b 项）
 *
 * 用法：electron-builder 出包后运行（build:win 已串联）
 * 产物：release/SHA256SUMS.txt（标准 <sha256>  <filename> 格式，可被 sha256sum -c 校验）
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const releaseDir = path.join(__dirname, '..', 'release')
const TARGET_EXT = new Set(['.exe', '.yml', '.blockmap'])

function sha256(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(file)
    stream.on('error', reject)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function main() {
  if (!fs.existsSync(releaseDir)) {
    console.error('[hash-manifest] release/ not found, run electron-builder first')
    process.exit(1)
  }

  const files = fs.readdirSync(releaseDir)
    .filter((f) => TARGET_EXT.has(path.extname(f).toLowerCase()))
    .filter((f) => f !== 'SHA256SUMS.txt')
    .map((f) => path.join(releaseDir, f))
    .filter((f) => fs.statSync(f).isFile())

  if (files.length === 0) {
    console.error('[hash-manifest] no artifacts found in release/')
    process.exit(1)
  }

  const lines = []
  for (const file of files) {
    const digest = await sha256(file)
    lines.push(digest + '  ' + path.basename(file))
    console.log('[hash-manifest] ' + digest.slice(0, 16) + '...  ' + path.basename(file))
  }

  const out = path.join(releaseDir, 'SHA256SUMS.txt')
  fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8')
  console.log('[hash-manifest] wrote ' + out + ' (' + files.length + ' files)')
}

main().catch((err) => {
  console.error('[hash-manifest] failed:', err.message)
  process.exit(1)
})
