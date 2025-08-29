Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)

' Change to the project directory
objShell.CurrentDirectory = strPath

' Run npm start hidden (0 = hidden window)
objShell.Run "cmd /c npm start", 0, False

' Exit silently
WScript.Quit
