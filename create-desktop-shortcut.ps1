# Create Desktop Shortcut for Abba App
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = "$DesktopPath\Abba.lnk"

# Create WScript Shell object
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)

# Set shortcut properties
$Shortcut.TargetPath = "C:\Users\yosiw\dyad-enhanced\node_modules\electron\dist\electron.exe"
$Shortcut.Arguments = "C:\Users\yosiw\dyad-enhanced"
$Shortcut.WorkingDirectory = "C:\Users\yosiw\dyad-enhanced"
$Shortcut.IconLocation = "C:\Users\yosiw\dyad-enhanced\build\icons\icon.ico, 0"
$Shortcut.Description = "Abba - AI App Builder"

# Save the shortcut
$Shortcut.Save()

Write-Host "Desktop shortcut created successfully at: $ShortcutPath" -ForegroundColor Green
Write-Host "You can now launch Abba from your desktop!" -ForegroundColor Cyan
