# Operación e indexación

## Actualización a demanda

Desde la interfaz, el botón **Actualizar ahora** reconstruye `data/library.json`. No borra ni modifica ninguna instalación de juegos.

También se puede ejecutar desde PowerShell:

```powershell
npm run scan
```

## Indexación nocturna

El script `tools/register-nightly-index.ps1` crea una tarea de Windows para ejecutar el índice todos los días a las 03:00. Debe ejecutarse una sola vez por el usuario desde PowerShell.

```powershell
.\tools\register-nightly-index.ps1
```

La tarea sólo actualiza el archivo de inventario local. No inicia el navegador ni los launchers.

## Acceso directo

El script `tools/create-desktop-shortcut.ps1` crea un acceso directo en el Escritorio para iniciar la aplicación local y abrir el navegador.

```powershell
.\tools\create-desktop-shortcut.ps1
```
