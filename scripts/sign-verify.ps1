# QA 签名验收脚本（工作包 T1，验收人：安全官）
#
# 用法:
#   .\scripts\sign-verify.ps1                          # 验证默认产物
#   .\scripts\sign-verify.ps1 release\xxx.exe          # 验证指定文件
#
# 退出码: 0 = 签名有效且可信 | 1 = 未签名/签名无效/不受信任 | 2 = 文件不存在
param(
    [string]$Path = "release\LingyunCheckin-Setup-2.0.0.exe"
)

if (-not (Test-Path $Path)) {
    Write-Host "[FAIL] file not found: $Path"
    exit 2
}

$sig = Get-AuthenticodeSignature -FilePath $Path
Write-Host "file:     $Path"
Write-Host "status:   $($sig.Status)"
Write-Host "signer:   $($sig.SignerCertificate.Subject)"
Write-Host "notAfter: $($sig.SignerCertificate.NotAfter)"
Write-Host "detail:   $($sig.StatusMessage)"

# Valid        = 真实受信证书签名（采购后应达到的唯一合格线）
# UnknownError = 存在签名但证书链不受信任（自签名演练的预期结果）
if ($sig.Status -eq 'Valid') {
    Write-Host "[PASS] signature valid and trusted"
    exit 0
}
elseif ($sig.SignerCertificate -ne $null) {
    Write-Host "[WARN] signed but chain not trusted (expected for self-signed drill)"
    exit 1
}
else {
    Write-Host "[FAIL] not signed"
    exit 1
}
