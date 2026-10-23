$projectPath = Split-Path $PSScriptRoot -Parent
$nodePath = (Get-Command node -ErrorAction Stop).Source
$running = Get-NetTCPConnection -LocalPort 4321 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $running) {
    Start-Process -FilePath $nodePath -ArgumentList 'src/server.mjs' -WorkingDirectory $projectPath -WindowStyle Hidden
    Start-Sleep -Seconds 1
}
Start-Process 'http://127.0.0.1:4321'
