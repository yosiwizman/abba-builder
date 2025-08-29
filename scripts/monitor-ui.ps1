Param(
  [int]$MetricsSeconds = 15,
  [int]$PerfSeconds = 30,
  [int]$HealthSeconds = 120,
  [int]$SuccessSeconds = 300,
  [switch]$LaunchApp
)

Write-Host "Launching UI monitoring orchestration..." -ForegroundColor Cyan

# Optional: launch app
if ($LaunchApp) {
  Write-Host "Launching Enhanced Dyad (npm start)..." -ForegroundColor Yellow
  Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Normal
  Start-Sleep -Seconds 10
}

# Start background jobs
$jobs = @()
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

$jobs += Start-Job -FilePath (Join-Path $scriptRoot "metrics-watch.ps1") -ArgumentList @($MetricsSeconds, 24)
$jobs += Start-Job -FilePath (Join-Path $scriptRoot "perf-watch.ps1") -ArgumentList @($PerfSeconds)
$jobs += Start-Job -FilePath (Join-Path $scriptRoot "health-watch.ps1") -ArgumentList @($HealthSeconds)
$jobs += Start-Job -FilePath (Join-Path $scriptRoot "success-watch.ps1") -ArgumentList @($SuccessSeconds, 24)
$jobs += Start-Job -FilePath (Join-Path $scriptRoot "logs-watch.ps1") -ArgumentList @()

Write-Host "Started jobs:" -ForegroundColor Green
$jobs | ForEach-Object { Write-Host ("  Id={0} Name={1}" -f $_.Id, $_.Name) }

Write-Host "`nUse Get-Job to list, Receive-Job -Id <id> -Keep to stream output, and Stop-Job -Id <id> to stop a job." -ForegroundColor DarkGray
Write-Host "Press Ctrl+C to stop all monitoring jobs." -ForegroundColor DarkGray

try {
  while ($true) { Start-Sleep -Seconds 3600 }
} finally {
  Write-Host "Stopping monitoring jobs..." -ForegroundColor Yellow
  $jobs | ForEach-Object { try { Stop-Job -Job $_ -Force -ErrorAction SilentlyContinue } catch {} }
  Write-Host "Monitoring stopped." -ForegroundColor Green
}

