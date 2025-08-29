Param(
  [int]$IntervalSeconds = 30
)

Write-Host "Starting health watch (every $IntervalSeconds s). Press Ctrl+C to stop." -ForegroundColor Cyan

while ($true) {
  Write-Host "`n========== HEALTH CHECK $(Get-Date) ==========" -ForegroundColor Yellow

  $app = Get-Process -Name electron -ErrorAction SilentlyContinue
  if ($null -ne $app) {
    Write-Host "✅ App process running (electron)"
  } else {
    Write-Warning "❌ App process not found - may have crashed"
  }

  # Quick Claude connectivity (no streaming)
  try {
    $env:DIAG_NO_STREAM = "true"
    $out = npm run --silent diagnostics:claude 2>&1 | Out-String
    if ($out -match "WORKING") {
      Write-Host "✅ Claude API accessible"
    } else {
      Write-Warning "⚠️  Claude diagnostics did not report WORKING"
    }
  } catch {
    Write-Warning "⚠️  Claude diagnostics failed: $($_.Exception.Message)"
  }

  # Metrics health
  try {
    $ms = npm run --silent metrics:summary 2>&1 | Out-String
    if ($ms -match "error|Error|ERROR") {
      Write-Warning "⚠️  Errors detected in metrics output"
    } else {
      Write-Host "✅ Metrics system healthy"
    }
  } catch {
    Write-Warning "⚠️  metrics:summary failed: $($_.Exception.Message)"
  }

  Write-Host "=========================================="
  Start-Sleep -Seconds $IntervalSeconds
}

