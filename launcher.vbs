'Launch Abba AI Builder silently without any visible console window
Dim objShell, objFSO, strPath, exePath
Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

' Change to app directory
strPath = "C:\Users\yosiw\dyad-enhanced"
objShell.CurrentDirectory = strPath

' Check if packaged EXE exists
exePath = strPath & "\out\Abba-win32-x64\Abba.exe"

If objFSO.FileExists(exePath) Then
    ' Launch packaged app directly - no console window (0 = hidden)
    objShell.Run Chr(34) & exePath & Chr(34), 0, False
Else
    ' Development mode - run npm start completely hidden (0 = hidden)
    ' Using 0 instead of 7 to completely hide the window
    objShell.Run "cmd /c npm start", 0, False
End If

' Exit immediately
WScript.Quit
