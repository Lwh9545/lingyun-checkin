// 全局前置：清理上一轮崩溃遗留的 electron 残留进程（持单实例锁会导致 launch 即死）
import { execSync } from 'node:child_process'
import path from 'node:path'

export default function globalSetup() {
  try {
    const script = path.join(process.cwd(), 'scripts', 'kill-electron.ps1')
    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}"`,
      { stdio: 'ignore', timeout: 15000 },
    )
  } catch {
    // 无残留进程或清理失败不阻塞测试（launch 自身会给出明确报错）
  }
}
