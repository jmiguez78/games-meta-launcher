# Operación de Viciódromo

## Buscar juegos a demanda

**Buscar juegos nuevos**, al pie de la barra lateral, revisa las instalaciones de Steam, Epic, GOG, Xbox, EA y Ubisoft y reconstruye `library.json`. Después sincroniza la cuenta de Steam y vuelve a verificar Arcade si hay un MAME configurado. No borra ni modifica ninguna instalación de juegos.

También se puede ejecutar desde PowerShell (sólo el inventario):

```powershell
npm run scan
```

## Tareas en segundo plano

Las tareas largas (indexar los dos MAME, Wikipedia e IGDB) corren de a una, por prioridad; buscar juegos y sincronizar Steam no esperan su turno. El avance se ve al pie de la barra lateral y en Configuración, y la interfaz se actualiza sola al terminar (eventos del servidor en `/api/events`).

## Indexación nocturna

En la aplicación portable, **Configuración → Búsqueda nocturna de juegos** programa una tarea diaria de Windows. La tarea abre el ejecutable con `--scan`, sin ventana: busca juegos instalados, sincroniza Steam y vuelve a verificar los dos MAME (sólo relee los `.zip` que cambiaron). El resultado queda en el registro de diagnóstico.

La tarea guarda la ruta exacta del `.exe` que la programó. Como `npm run package` deja sólo los dos últimos ejecutables, al abrir otra versión el launcher compara esa ruta con la propia y, si no coinciden, vuelve a crear la tarea con el mismo horario (queda en el registro: «Tarea nocturna reprogramada»). Configuración muestra la última ejecución, su resultado y avisa si la tarea apunta a un ejecutable que ya no existe.

Durante el desarrollo, el script `tools/register-nightly-index.ps1` crea otra tarea, «Viciódromo - Búsqueda nocturna (desarrollo)», que ejecuta el índice todos los días a las 03:00 y guarda en `data/` del proyecto. Debe ejecutarse una sola vez por el usuario desde PowerShell. Hasta la 0.33.0 las dos tareas tenían el mismo nombre: registrar la de desarrollo reemplazaba la de la aplicación, el índice nocturno quedaba en `data/` y el launcher no veía los juegos nuevos. Al abrirse, la 0.33.0 detecta que la tarea apunta a otro programa y la vuelve a crear.

```powershell
.\tools\register-nightly-index.ps1
```

## Cómo se encuentran los juegos instalados

`src/indexer.mjs` revisa todas las unidades que existen (de C: a Z:; una de red que no responde en 1,5 s se saltea) y el registro de Windows, leído con PowerShell en UTF-8. Las pruebas reemplazan unidades y registro con `scanLibrary({ env })`.

| Tienda | De dónde sale | Cómo se abre |
| --- | --- | --- |
| Steam | Carpeta de Steam del registro (`SteamPath`), sus bibliotecas en `libraryfolders.vdf` y `SteamLibrary` en cada unidad | `steam://run/<appid>` |
| Epic Games | Manifiestos en `%ProgramData%\Epic\EpicGamesLauncher\Data\Manifests` | `com.epicgames.launcher://apps/<app>` |
| Xbox / Microsoft Store | Carpetas de `.GamingRoot` en la raíz de cada unidad y `XboxGames` | `shell:AppsFolder\<paquete>!<app>` |
| Ubisoft Connect | Registro `Ubisoft\Launcher\Installs\<número>`; respaldo: `UbisoftLibrary` en cada unidad (sin número no se abre) | `uplay://launch/<número>/0` |
| GOG Galaxy | Registro `GOG.com\Games\<número>` con su ejecutable; respaldo: `GOG Games` y `GOG Galaxy Games` | El ejecutable del registro |
| EA app | Registro `Electronic Arts` y `EA Games` («Install Dir»); respaldo: `C:\Program Files\EA Games`, `EA Games` y `EALibrary` | El ejecutable principal de la carpeta |

Un juego que aparece por el registro y por una carpeta de respaldo se cuenta una vez.

## Tus capturas

Las capturas (`.png`, `.jpg`, `.webp`) y los videos (`.mp4`, `.webm`) se leen en su lugar, sin copiarlas (`src/screenshots.mjs`); los videos se sirven por partes (`/api/screenshots/video/:id`, con `Range`) y los de MAME grabados con Game Bar se asocian por el set que figura entre corchetes en el nombre; el índice vive en memoria y se rehace como mucho una vez por minuto, o con «Buscar de nuevo».

| Programa | Carpeta | Cómo se asocia al juego |
| --- | --- | --- |
| Steam (F12) | `<Steam>\userdata\<cuenta>\760\remote\<appid>\screenshots` (la carpeta de Steam sale del registro) | Número de juego; usa las miniaturas de `thumbnails` |
| MAME (F12) | `snapshot_directory` de `mame.ini` (`snap` si no está), una subcarpeta por set | Set o versión regional |
| Xbox Game Bar y el botón de captura del mando | La carpeta «Capturas» de Windows (`Videos\Captures`, o la que figure en el registro si se movió), con sus subcarpetas | Nombre del archivo, sin la fecha; los `.jxr` (HDR) se ignoran porque Game Bar guarda al lado una copia `.png` |
| NVIDIA y Videos | `Videos\NVIDIA` y `Videos`, con sus subcarpetas (hasta tres niveles) | Nombre de la carpeta; si no es el de un juego, el de cada archivo |
| Carpetas propias | Las de **Configuración → Tus capturas** | Nombre de la subcarpeta o del archivo |

Los nombres se comparan sin tildes, marcas ni signos; si el nombre de la captura es el comienzo de un solo juego («Control» → «Control Ultimate Edition») también se asocia, pero no si hay varios posibles. Los juegos de Arcade no se asocian por nombre. Para las pruebas, `GML_STEAM_DIR`, `GML_VIDEOS_DIR` y `GML_CAPTURES_DIR` reemplazan las carpetas reales.

## Dónde se guardan los datos

- **Desarrollo** (`npm start`, `npm run desktop`): en `data/` dentro del proyecto (excluida del repositorio).
- **Portable:** en la carpeta `Viciódromo - datos` junto al `.exe` si existe o si es una PC sin datos previos; si la PC ya tenía datos, en el perfil de Windows (`%APPDATA%\Viciódromo`). **Configuración → Datos del portable** los copia junto al ejecutable. Las cachés del navegador interno quedan siempre en el perfil de Windows.
- **Cambio de nombre (0.36.0):** si `%APPDATA%\Viciódromo` no tiene datos y `%APPDATA%\Games Meta Launcher` sí, se copian (menos las cachés pesadas de Chromium) y la carpeta vieja queda como respaldo. La carpeta `Games Meta Launcher - datos` junto al `.exe` se renombra a `Viciódromo - datos`, y la tarea «Games Meta Launcher - Indexación nocturna» se reemplaza por «Viciódromo - Búsqueda nocturna» con el mismo horario.

| Archivo                                 | Contenido                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| `library.json`                          | Inventario de la última búsqueda (se regenera)                                     |
| `preferences.json`                      | Favoritos, etiquetas, notas, progreso, puntuación, tiempo jugado, listas y ajustes |
| `sessions.json`                         | Sesiones medidas por el launcher (hasta 5.000)                                     |
| `metadata.json`                         | Fichas de IGDB                                                                     |
| `arcade-*.json`, `mame-*.json`          | Índice de Arcade y del MAME alternativo (se regeneran)                             |
| `integrations.json`, `steam-*`          | Conexiones de IGDB y Steam (claves cifradas para tu usuario de Windows)            |
| `covers/`, `art-cache/`, `steam-cache/` | Portadas propias, arte descargado y respuestas de Steam                            |
| `logs/gml.log`                          | Registro de diagnóstico (rota al pasar 1 MB)                                       |

## Datos personales y sesiones

Los datos personales se asocian al identificador estable de cada juego: buscar juegos de nuevo no los borra. La fecha de última vez jugado se actualiza al iniciar un juego desde Viciódromo. Las sesiones (con su duración) se miden cuando el juego se abre desde el launcher: Arcade viendo cerrarse a MAME y, en Windows, el resto vigilando los procesos que corren desde la carpeta de instalación del juego. Lo jugado fuera del launcher sólo cuenta si lo informa Steam.

**Configuración → Respaldo** exporta e importa favoritos, notas, etiquetas, portadas propias, rutas personalizadas y listas.

## Diagnóstico

**Configuración → Estado y diagnóstico → Exportar diagnóstico** arma un archivo con la versión, el estado de los archivos de datos y las últimas líneas del registro, sin claves, notas ni otros datos personales.

## Claves en otra PC

Las claves de Steam e IGDB se cifran con Windows DPAPI para el usuario que las guardó. Con el portable en otra PC (o con otro usuario) no se pueden abrir: la biblioteca sigue funcionando, el launcher avisa al abrir y Configuración pide volver a conectarlas.

## Acceso directo

Para desarrollo, el script `tools/create-desktop-shortcut.ps1` crea un acceso directo «Viciódromo (desarrollo)» en el Escritorio que inicia la interfaz local en el navegador. Con el portable no hace falta: alcanza con un acceso directo al `.exe`.

```powershell
.\tools\create-desktop-shortcut.ps1
```
