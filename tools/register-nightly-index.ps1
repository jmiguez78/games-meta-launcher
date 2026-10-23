$projectPath = Split-Path $PSScriptRoot -Parent
$nodePath = (Get-Command node -ErrorAction Stop).Source
$taskName = 'Games Meta Launcher - Indexación nocturna'
$action = New-ScheduledTaskAction -Execute $nodePath -Argument 'src/indexer.mjs' -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description 'Actualiza el inventario local de Games Meta Launcher.' -Force
Write-Host "Tarea '$taskName' creada."
