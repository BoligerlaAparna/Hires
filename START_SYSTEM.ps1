$backendPort = 8089
$frontendPort = 3000

Write-Host "--- RECRUITAI SYSTEM CLEANUP & START ---" -ForegroundColor Cyan

# 1. Kill everything on 8088 and 3000
function Clear-Port ([int]$port) {
    Write-Host "Checking Port $port..."
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($processes) {
        foreach ($p in $processes) {
            Write-Host "Forcefully terminating process PID $p on port $port..." -ForegroundColor Yellow
            taskkill /PID $p /F /T
        }
        Start-Sleep -Seconds 2
    } else {
        Write-Host "Port $port is already clear." -ForegroundColor Green
    }
}

Clear-Port $backendPort
Clear-Port $frontendPort

# 2. Start Backend (Redirecting output to log file for debugging)
Write-Host "Starting Backend on Port 8088..." -ForegroundColor Cyan
Set-Location -Path ".\backend"
# Use cmd /c to handle redirection properly for the detached process
Start-Process powershell -ArgumentList "-NoExit", "-Command", "mvn spring-boot:run | Tee-Object -FilePath '..\backend_debug.log'" -WindowStyle Normal

# 3. Start Frontend
Set-Location -Path ".."
Write-Host "Starting Frontend on Port 3000..." -ForegroundColor Cyan
npm run dev

Write-Host "--- SYSTEM LAUNCHED ---" -ForegroundColor Green
