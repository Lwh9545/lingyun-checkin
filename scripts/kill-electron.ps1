# 清理本项目残留的 electron 开发实例
# 根因：应用有单实例锁，上一轮 E2E 崩溃遗留的进程会导致 electron.launch 立即退出
# 安全性：只杀 CommandLine 含本项目标记的 electron.exe，不影响 VS Code 等其他 Electron 应用
Get-CimInstance Win32_Process -Filter "Name='electron.exe'" |
  Where-Object { $_.CommandLine -like '*灵韵打卡*' -or $_.CommandLine -like '*desktop-app*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
