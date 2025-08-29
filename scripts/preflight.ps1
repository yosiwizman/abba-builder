Write-Host "Starting pre-flight system validation..." -ForegroundColor Cyan

if (-not $env:ANTHROPIC_API_KEY -or $env:ANTHROPIC_API_KEY -eq "") {
  Write-Warning "WARNING: ANTHROPIC_API_KEY not set"
} else {
  Write-Host "API key configured" -ForegroundColor Green
}

Write-Host "Running Claude connectivity diagnostics (no streaming)..." -ForegroundColor Yellow
$env:DIAG_NO_STREAM = "true"
try {
  npm run --silent diagnostics:claude | Out-String | Write-Host
} catch {
  Write-Warning "Diagnostics failed: $($_.Exception.Message)"
}

