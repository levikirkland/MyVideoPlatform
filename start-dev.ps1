$ScriptPath = $PSScriptRoot
$ServerPath = Join-Path $ScriptPath "server"
$ClientPath = Join-Path $ScriptPath "client"

Write-Host "Starting Development Environment..." -ForegroundColor Cyan

# Start Backend
Write-Host "Launching Backend (Port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ServerPath'; `$env:PORT=5000; `$env:JWT_SECRET='devsecret'; npm run dev"

# Start Frontend
Write-Host "Launching Frontend (Port 5174)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ClientPath'; npm run dev"

Write-Host "Done! Check the new terminal windows." -ForegroundColor Cyan
