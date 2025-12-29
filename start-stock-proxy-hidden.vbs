Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c node stock-proxy\server.js", 0, False
Set WshShell = Nothing
