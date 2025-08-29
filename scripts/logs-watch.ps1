Param(
  [int]$IntervalSeconds = 30
)

Write-Host "Starting log watch (every $IntervalSeconds s check; stream latest log). Press Ctrl+C to stop." -ForegroundColor Cyan

function Get-LogDir {
  if ($env:APPDATA) { return Join-Path $env:APPDATA "npm-cache\_logs" }
  return "$HOME\AppData\Roaming\npm-cache\_logs"
}

$dir = Get-LogDir
if (-not (Test-Path $dir)) {
  Write-Warning "Log directory not found: $dir"
}

# helper to select latest log
function Tail-LatestLog {
  param([string]$directory)
  $file = Get-ChildItem -Path $directory -Filter *.log -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($null -eq $file) { Write-Host "No logs yet..." -ForegroundColor DarkGray; return }
  Write-Host "Tailing: $($file.FullName)" -ForegroundColor Yellow
  Get-Content -Path $file.FullName -Wait -Tail 0 | ForEach-Object {
    if ($_ -match '(?i)error') { Write-Host "🚨 ERROR: $_" -ForegroundColor Red }
    elseif ($_ -match '(?i)token.*200000') { Write-Host "⚠️ TOKEN LIMIT: $_" -ForegroundColor DarkYellow }
    else { Write-Host $_ }
  }
}

Tail-LatestLog -directory $dir

