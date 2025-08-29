# Direct Abba AI Builder Launcher
Write-Host "Starting Abba AI Builder..." -ForegroundColor Green
Set-Location "C:\Users\yosiw\dyad-enhanced"

# Start npm in a new window that stays open
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\yosiw\dyad-enhanced'; npm start"

Write-Host "✅ App is launching in a new window" -ForegroundColor Green
Write-Host "Please wait 30-60 seconds for it to fully load" -ForegroundColor Yellow
