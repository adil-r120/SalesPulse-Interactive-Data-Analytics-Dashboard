@echo off
echo Starting SalesPulse servers in background...

echo [1/3] Starting Stock Proxy Server (hidden)...
start /min wscript start-stock-proxy-hidden.vbs
timeout /t 2 /nobreak >nul

echo [2/3] Starting Backend Server (hidden)...
start /min wscript start-backend-hidden.vbs
timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend Server...
start "SalesPulse Frontend" npm run dev

echo.
echo ✓ All servers started!
echo.
echo Stock Proxy: http://localhost:5000 (running in background)
echo Backend API: http://localhost:8000 (running in background)
echo Frontend: http://localhost:5173 (this window)
echo.
echo Press Ctrl+C to stop the frontend server.
echo To stop background servers, use Task Manager or: 
echo   taskkill /F /IM node.exe
echo   taskkill /F /IM python.exe
echo.
pause
