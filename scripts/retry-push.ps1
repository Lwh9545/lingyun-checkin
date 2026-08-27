# 自动重试推送（P1 网络窗口捕获）：每 3 分钟试一次，最多 10 次，成功即退
$max = 10
for ($i = 1; $i -le $max; $i++) {
    Write-Host "[$(Get-Date -Format HH:mm:ss)] push attempt $i/$max"
    git push https://github.com/Lwh9545/lingyun-checkin.git main 2>&1 | Out-Host
    if ($LASTEXITCODE -eq 0) { Write-Host "PUSH SUCCESS"; exit 0 }
    Start-Sleep -Seconds 180
}
Write-Host "PUSH FAILED after $max attempts"
exit 1
