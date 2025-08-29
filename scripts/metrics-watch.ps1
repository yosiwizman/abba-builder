Param(
  [int]$IntervalSeconds = 15,
  [int]$Hours = 24
)

Write-Host "Starting metrics summary watch (every $IntervalSeconds s, window=$Hours h). Press Ctrl+C to stop." -ForegroundColor Cyan
$env:METRICS_HOURS = "$Hours"

while ($true) {
  Write-Host "`n================ METRICS SUMMARY: $(Get-Date) ================" -ForegroundColor Yellow
  try {
    npm run --silent metrics:summary | Out-String | Write-Host
  } catch {
    Write-Warning "metrics:summary failed: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds $IntervalSeconds
}

