# Abba AI Builder - Direct Launcher
Set-Location -Path "C:\Users\yosiw\dyad-enhanced"

# Hide the PowerShell window
$t = '[DllImport("user32.dll")] public static extern bool ShowWindow(int handle, int state);'
Add-Type -Name Win -Member $t -Namespace native
[native.win]::ShowWindow(([System.Diagnostics.Process]::GetCurrentProcess() | Get-Process).MainWindowHandle, 0)

# Start the Electron app
Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Hidden -WorkingDirectory "C:\Users\yosiw\dyad-enhanced"

# Keep process alive but hidden
Start-Sleep -Seconds 2
