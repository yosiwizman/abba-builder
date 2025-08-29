Param(
  [int]$IntervalSeconds = 300,
  [int]$Hours = 24
)

Write-Host "Starting success analysis watch (every $IntervalSeconds s, window=$Hours h). Press Ctrl+C to stop." -ForegroundColor Cyan
$env:METRICS_HOURS = "$Hours"

while ($true) {
  Write-Host "`n========== SUCCESS RATE ANALYSIS $(Get-Date) ==========" -ForegroundColor Yellow
  try {
    npm run --silent metrics:analysis | Out-String | Write-Host
  } catch {
    Write-Warning "metrics:analysis failed: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds $IntervalSeconds
}

