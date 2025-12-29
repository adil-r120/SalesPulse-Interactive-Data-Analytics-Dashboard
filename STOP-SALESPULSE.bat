@echo off
echo Stopping SalesPulse servers...

echo [1/3] Stopping Stock Proxy Server...
taskkill /F /FI "WINDOWTITLE eq stock-proxy*" /IM node.exe 2>nul

echo [2/3] Stopping Backend Server...
taskkill /F /FI "COMMANDLINE eq *backend*" /IM python.exe 2>nul

echo [3/3] Stopping Frontend Server...
taskkill /F /FI "WINDOWTITLE eq *vite*" /IM node.exe 2>nul

echo.
echo ✓ All SalesPulse servers stopped!
echo.
pause
