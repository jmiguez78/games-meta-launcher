# Operación e indexación

## Actualización a demanda

Desde la interfaz, el botón **Actualizar** reconstruye `data/library.json`. No borra ni modifica ninguna instalación de juegos.

También se puede ejecutar desde PowerShell:

```powershell
npm run scan
```

## Indexación nocturna

En la aplicación portable, la sección **Configuración** permite establecer la hora de la tarea diaria de Windows. La tarea ejecuta la indexación sin abrir la ventana de la aplicación.

Durante el desarrollo, el script `tools/register-nightly-index.ps1` crea una tarea de Windows para ejecutar el índice todos los días a las 03:00. Debe ejecutarse una sola vez por el usuario desde PowerShell.

```powershell
.\tools\register-nightly-index.ps1
```

La tarea sólo actualiza el archivo de inventario local. No inicia el navegador ni los launchers.

## Datos personales

Favoritos, etiquetas, progreso, puntuación, notas, portadas y la fecha de última vez jugado se conservan en `data/preferences.json`. La reindexación no los elimina: se asocian al identificador estable de cada plataforma. La fecha se actualiza cuando el juego se inicia desde Games Meta Launcher; no intenta inferir sesiones iniciadas por fuera de la aplicación.

## Acceso directo

El script `tools/create-desktop-shortcut.ps1` crea un acceso directo en el Escritorio para iniciar la aplicación local.

```powershell
.\tools\create-desktop-shortcut.ps1
```
