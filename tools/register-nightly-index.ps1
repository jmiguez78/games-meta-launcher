$projectPath = Split-Path $PSScriptRoot -Parent
$nodePath = (Get-Command node -ErrorAction Stop).Source
# Nombre distinto al de la aplicación: si fueran iguales, esta tarea (que guarda en data/ del proyecto)
# reemplazaría a la del ejecutable y el launcher no vería los juegos nuevos.
$taskName = 'Viciódromo - Búsqueda nocturna (desarrollo)'
$action = New-ScheduledTaskAction -Execute $nodePath -Argument 'src/indexer.mjs' -WorkingDirectory $projectPath
$trigger = New-ScheduledTaskTrigger -Daily -At 3:00AM
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description 'Actualiza el inventario local de Viciódromo (desarrollo).' -Force
Write-Host "Tarea '$taskName' creada."
