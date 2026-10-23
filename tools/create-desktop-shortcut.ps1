$projectPath = Split-Path $PSScriptRoot -Parent
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'Games Meta Launcher.lnk'
$nodePath = (Get-Command node -ErrorAction Stop).Source
$launcher = Join-Path $projectPath 'tools\launch.ps1'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$launcher`""
$shortcut.WorkingDirectory = $projectPath
$shortcut.IconLocation = "$nodePath,0"
$shortcut.Save()
Write-Host "Acceso directo creado: $shortcutPath"
