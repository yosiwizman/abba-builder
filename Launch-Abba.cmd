@echo off
:: Hide this window and launch Electron
powershell -WindowStyle Hidden -Command "Set-Location 'C:\Users\yosiw\dyad-enhanced'; Start-Process npm -ArgumentList 'start' -WindowStyle Hidden"
exit
