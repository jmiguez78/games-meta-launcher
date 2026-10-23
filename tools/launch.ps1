$projectPath = Split-Path $PSScriptRoot -Parent
$nodePath = (Get-Command node -ErrorAction Stop).Source
Start-Process -FilePath $nodePath -ArgumentList 'src/server.mjs' -WorkingDirectory $projectPath -WindowStyle Hidden
Start-Sleep -Seconds 1
Start-Process 'http://localhost:4321'
