Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c backend\venv\Scripts\python.exe backend\run.py", 0, False
Set WshShell = Nothing
