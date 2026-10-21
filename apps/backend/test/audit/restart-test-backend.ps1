# Restart test backend (port 4100, DB surplusiq_test, no watch). Run before each audit suite.
Get-NetTCPConnection -LocalPort 4100 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Start-Sleep -Seconds 2
$env:POSTGRES_DB = 'surplusiq_test'; $env:PORT = '4100'
Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','npm run start > %TEMP%\be_test.log 2>&1' -WorkingDirectory "$PSScriptRoot\..\.." -WindowStyle Hidden
for ($i = 0; $i -lt 60; $i++) { Start-Sleep -Seconds 3; try { if ((Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:4100/platform-settings' -TimeoutSec 3).StatusCode -eq 200) { 'test backend ready'; exit 0 } } catch {} }
'test backend failed to start'; exit 1
