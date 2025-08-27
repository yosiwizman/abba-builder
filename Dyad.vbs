Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Change to the app directory
WshShell.CurrentDirectory = strPath

' Kill any existing instances first (cleanup)
WshShell.Run "taskkill /F /IM electron.exe", 0, True
WshShell.Run "taskkill /F /IM node.exe", 0, True

' Wait a moment for cleanup
WScript.Sleep 1000

' Launch the app completely hidden (0 = hidden window)
WshShell.Run "cmd /c npm start", 0, False

' Script exits immediately, app continues running
WScript.Quit
