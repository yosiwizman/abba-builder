Param(
  [int]$IntervalSeconds = 30
)

Write-Host "Starting performance watch (every $IntervalSeconds s). Press Ctrl+C to stop." -ForegroundColor Cyan

function Show-Proc($name) {
  $p = Get-Process -Name $name -ErrorAction SilentlyContinue
  if ($null -ne $p) {
    foreach ($proc in $p) {
      $wsMB = [math]::Round($proc.WorkingSet64 / 1MB, 1)
      $pmMB = [math]::Round($proc.PagedMemorySize64 / 1MB, 1)
      $cpu   = [math]::Round($proc.CPU, 2)
      Write-Host ("{0,-10} PID={1,-6} WS={2,6}MB PM={3,6}MB CPU(sec)={4,6}" -f $proc.ProcessName, $proc.Id, $wsMB, $pmMB, $cpu)
    }
  } else {
    Write-Host "${name}: (not running)" -ForegroundColor DarkGray
  }
}

while ($true) {
  Write-Host "`n---------- PERFORMANCE CHECK $(Get-Date) ----------" -ForegroundColor Yellow
  Write-Host "Electron / App Process(es):" -ForegroundColor Green
  Show-Proc -name "electron"
  Show-Proc -name "Abba"
  Write-Host "Node helpers:" -ForegroundColor Green
  Show-Proc -name "node"
  Start-Sleep -Seconds $IntervalSeconds
}

