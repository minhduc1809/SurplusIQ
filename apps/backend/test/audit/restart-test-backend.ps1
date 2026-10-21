# Restart test backend (DB surplusiq_test, no watch). Usage: restart-test-backend.ps1 [-Port 4100] [-NodeEnv development]
param([int]$Port = 4100, [string]$NodeEnv = 'development')
Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Start-Sleep -Seconds 2
$env:POSTGRES_DB = 'surplusiq_test'; $env:PORT = "$Port"; $env:NODE_ENV = $NodeEnv
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c',"npm run start > %TEMP%\be_test_$Port.log 2>&1" -WorkingDirectory "$PSScriptRoot\..\.." -WindowStyle Hidden
for ($i = 0; $i -lt 60; $i++) { Start-Sleep -Seconds 3; try { if ((Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$Port/platform-settings" -TimeoutSec 3).StatusCode -eq 200) { "test backend ready on $Port"; exit 0 } } catch {} }
'test backend failed to start'; exit 1
