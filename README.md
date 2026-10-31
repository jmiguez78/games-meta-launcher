# Games Meta Launcher

Lanzador local para Windows que reúne juegos detectados en Steam, Epic Games, Xbox/Microsoft Store, Ubisoft Connect, EA app y GOG Galaxy en una sola biblioteca. El encabezado conserva un guiño retro; los controles priorizan una interfaz de escritorio clara.

## Estado

Versión `0.31.0`. Detecta instalaciones locales y las reúne con tu cuenta de Steam, sin repetir juegos comprados en varias tiendas. Inicio propone qué jugar con una imagen principal y filas por intención. La Biblioteca tiene dos vistas (Portadas y Tabla), orden visible y filtros por tienda, género, duración, tiempo jugado, valoración y etiquetas. Cada juego tiene su página con arte, logo, descripción en español cuando Steam la ofrece, tiempo jugado y logros. Al jugar aparece una pantalla «Iniciando…» y la ventana se minimiza. Se usa con mouse, teclado o mando, y tiene un modo sala para la TV y el mando (F11 o el botón Menú). Suma los juegos de MAME como una tienda más, Arcade, con versiones regionales agrupadas y arte de libretro. Mide el tiempo jugado de los juegos que abrís desde el launcher, en todas las tiendas, y lo resume en **Tu actividad**. La información ampliada de IGDB sigue en beta.

## Uso rápido

1. Generá el portable con `npm run package` y abrí `releases/Games Meta Launcher 0.31.0.exe`, o ejecutá `npm run desktop` durante el desarrollo. La primera vez, **Primeros pasos** en Inicio muestra los juegos encontrados por tienda y lo que falta conectar (Steam, IGDB, Arcade); se oculta al completarlo o con «Ocultar».
2. En **Inicio**, elegí el juego destacado o uno de las filas. Un clic en una portada abre la página del juego; Jugar lo inicia.
3. En **Biblioteca**, buscá, ordená y filtrá. Por defecto se muestran los juegos instalados; «Toda la cuenta» suma los de Steam sin instalar.
4. En **Configuración**, elegí el tema, si la ventana se minimiza al jugar y la pantalla grande; conectá Steam e IGDB; programá la búsqueda nocturna y respaldá tus preferencias.
5. En **Tu actividad**, mirá las horas por semana, los más jugados, tu racha y las últimas sesiones.
6. Con un mando, apretá Menú (o F11 en el teclado) para pasar al **modo sala**: pantalla completa, filas grandes y el arte del juego de fondo. A elige, B vuelve, X marca favorito, Y salta de letra en la Biblioteca, LB/RB cambian de sección, Vista (⧉) alterna entre los juegos listos para jugar (lo que muestra al entrar) y toda la colección, y Menú abre las opciones (incluida la salida).

La versión portable incluye su propio runtime. Para desarrollo se requiere `npm install`.

## Desarrollo

| Comando           | Acción                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `npm start`       | Inicia la interfaz local.                                                                                |
| `npm run scan`    | Reconstruye el inventario sin abrir la interfaz.                                                         |
| `npm run check`   | Sintaxis de todo el código, `import` de la interfaz y reglas de los estilos.                             |
| `npm test`        | Pruebas automáticas del servidor, los módulos y las herramientas (`node:test`).                          |
| `npm run test:ui` | Pruebas de interfaz con Playwright: pantallas, flujos, accesibilidad y capturas de referencia.           |
| `npm run verify`  | Todo lo anterior, como la integración continua. Conviene correrlo antes de etiquetar una versión.        |
| `npm run format`  | Formatea el código con Prettier.                                                                         |
| `npm run desktop` | Abre la aplicación en una ventana de escritorio.                                                         |
| `npm run package` | Genera el portable de Windows y lo guarda en `releases/`. Conserva sólo la versión actual y la anterior. |

La primera vez, `npx playwright install chromium` descarga el navegador de las pruebas de interfaz. Si un cambio visual es intencional, `npm run test:ui -- --update-snapshots` actualiza las capturas de referencia (`test/ui/capturas/`).

El inventario generado se guarda en `data/library.json`, que no forma parte del repositorio porque representa el estado de esta PC. Tus favoritos, etiquetas, progreso, notas, puntuaciones, portadas y fecha de última vez jugado se guardan localmente en `data/preferences.json` y `data/covers/`, también excluidos del repositorio. La fecha de juego se registra al iniciar un título desde Games Meta Launcher.

## Sesiones y «Tu actividad»

Al iniciar un juego, el launcher vigila su carpeta de instalación (en Windows, consultando los procesos cada pocos segundos mientras espera y cada 15 s durante el juego). La sesión empieza cuando aparece un proceso que corre desde esa carpeta y termina cuando deja de verse dos veces seguidas; los reportes de errores, instaladores y antitrampas no cuentan. Si el juego no aparece en 4 minutos (por ejemplo, un lanzador que pide actualizar), esa sesión no se mide. Al cerrarse, la ventana vuelve al frente, aparece un aviso con la duración y se guarda en `sessions.json` (versión de esquema 1, hasta 5.000 sesiones). Arcade se mide como antes, viendo cerrarse a MAME.

**Tu actividad** suma las horas por semana (lo medido por el launcher), las últimas dos semanas (con las horas que informa Steam, también las jugadas fuera del launcher), los más jugados (horas de Steam o medidas), la racha de días seguidos y las últimas sesiones.

## Tareas en segundo plano

Buscar juegos, sincronizar Steam, indexar los dos MAME, Wikipedia e IGDB pasan por una sola fila: corren de a una, por prioridad, y pedir dos veces la misma no la duplica. La interfaz no sondea: escucha `/api/events` (eventos del servidor) y recibe el avance (al pie de la barra lateral), un aviso cuando cambian los datos de la biblioteca y cada sesión medida.

## Portable

El portable muestra una imagen de bienvenida mientras se descomprime. Sus datos pueden viajar con el ejecutable, en la carpeta `Games Meta Launcher - datos` junto al `.exe`:

- si esa carpeta existe, se usa;
- si no, y la PC ya tiene datos en el perfil de Windows (`%APPDATA%\Games Meta Launcher`), se siguen usando esos. **Configuración → Datos del portable → Guardar junto al .exe** los copia (sin las cachés del navegador interno) y vuelve a abrir el launcher; la copia del perfil queda como respaldo;
- en una PC sin datos, se crea la carpeta junto al `.exe` si se puede escribir ahí.

Las claves de Steam e IGDB se cifran para cada usuario de Windows: en otra PC no se pueden abrir. El launcher sigue funcionando, avisa al abrir y Configuración pide volver a conectarlas.

## Arcade (MAME)

En **Configuración → Arcade (MAME)**, pegá la ruta de `mame.exe` y elegí **Guardar y buscar juegos**. El launcher:

1. Lee la descripción de las máquinas con `mame -listxml` (una vez por versión de MAME y conjunto de archivos; se guarda en `mame-<versión>.json`).
2. Lee el índice de cada `.zip` de las carpetas de `rompath` de tu `mame.ini`, sin descomprimir, y verifica cada set por CRC, incluidos padre, BIOS por defecto y dispositivos. Los `.zip` que no cambiaron no se vuelven a leer (`arcade-zips.json`).
3. Descarta BIOS, dispositivos, máquinas mecánicas, utilidades, sets incompletos y emulación preliminar. Oculta el contenido para adultos, casino y mahjong salvo que se active en Configuración.
4. Agrupa las versiones regionales bajo un juego, con la versión mundial o de EE. UU. adelante, y suma género, saga y ranking desde `catver.ini`, `series.ini` y `bestgames.ini` de [AntoPISA/MAME_SupportFiles](https://github.com/AntoPISA/MAME_SupportFiles) (se descargan cada 30 días a `mame-support/`; si la descarga falla se usa la copia anterior o la incluida en `src/mame-support/`, y Configuración lo informa).

Las portadas son los flyers de la máquina, la imagen principal una captura en pixel art y el logo el de la máquina, desde [libretro-thumbnails/MAME](https://github.com/libretro-thumbnails/MAME), o desde las carpetas `flyers`, `snap` y `logo` de tu MAME si existen. Se guardan en `art-cache`.

Después de indexar, cada juego de Arcade se busca en Wikipedia: el artículo en inglés lleva a Wikidata, que confirma que sea un videojuego del año correcto y aporta el identificador de IGDB y el artículo en español. La introducción en español se muestra como descripción (con enlace al artículo) y, si IGDB está conectado, el juego recibe su ficha (valoración, capturas, videos) como los de PC; sin identificador de Wikidata, IGDB sólo acepta el mismo título en la plataforma Arcade. Se guarda en `arcade-info.json` y se renueva cada 30 días. Con más de 300 juegos, sólo se buscan los favoritos y los jugados. Los juegos de pelea suman **Movimientos** desde `command.dat`.

Jugar abre `mame.exe <set>` desde la carpeta de MAME, así que usa tu configuración. Al cerrar MAME, la ventana vuelve al frente y se suma el tiempo jugado (`playSeconds` en las preferencias). En la Biblioteca, el selector **PC · Arcade · Todo** separa las colecciones; Inicio suma la fila **Clásicos del arcade**.

### MAME alternativo

Algunos sets viejos sólo arrancan con una versión anterior de MAME. En el mismo formulario, **MAME alternativo (opcional)** acepta la ruta de otro MAME (`mame.exe` o `mame64.exe`) con su propia carpeta de ROMs (la de su `mame.ini`, o `roms` junto al ejecutable). Se indexa igual que el principal, con sus archivos `arcade-legacy-*.json`, y a la biblioteca se suman sólo los juegos que el principal no tiene, ni como versión regional ni con el mismo título. Cada juego se abre con el MAME que lo verificó; la ficha muestra «Emulador: MAME 0.170 (alternativo)». Dejá el campo vacío para quitarlo.

## Información ampliada de IGDB

En **Configuración → Información de juegos**, conectá IGDB y elegí **Actualizar información**. Para consultar los datos, abrí **Biblioteca → Detalle** y seleccioná un juego. La ficha organiza el contenido en **Resumen**, **Información** y **Multimedia**. Las imágenes se amplían dentro de la aplicación y se recorren con las flechas; Escape cierra el visor. Las secciones sólo aparecen cuando IGDB dispone de información; la historia queda plegada por posibles spoilers. Los textos se conservan en la caché local, mientras que las imágenes de la galería pueden requerir internet.

## Conexión con Steam

En **Configuración → Steam**, ingresá tu SteamID64 y clave de Steam Web API, o usá la conexión guardada en esta PC. Las credenciales se cifran con Windows DPAPI para tu usuario. El portable incluye `steam-games-mcp` 0.17.0 y su runtime; funciona sin Codex ni Node instalados.

La biblioteca cruza cuenta e instalaciones por App ID. Elegí **Instalados** o **Toda la cuenta** junto a la búsqueda; **Instalar en Steam** abre el cliente para administrar la descarga. Steam funciona como fuente de datos de la biblioteca, sin una sección propia en el menú. La sincronización está en Configuración. Las fichas agregan **Steam** y **Logros**, con requisitos, idiomas, mando, compatibilidad, reseñas agregadas, novedades y rareza global. Las reseñas individuales pueden no estar disponibles en Steam.

La Biblioteca tiene dos vistas: **Portadas** para explorar y **Tabla** para ordenar y comparar horas, última sesión, valoración y duración. Un clic en un juego abre su página.

Los precios muestran la moneda recibida (la región AR puede devolver USD). Biblioteca y logros completos usan APIs oficiales para evitar recortes del MCP. Las consultas sociales parciales indican cuántos resultados se muestran. Los perfiles privados se presentan como información no disponible. El progreso personal del launcher permanece independiente.

La caché conserva los últimos datos válidos ante fallas de red, con fecha y aviso de antigüedad. Steam y sus imágenes requieren conexión para actualizarse. `steam-account.json`, `steam-cache/` y `steam-credentials.json` se guardan en el perfil de la aplicación (o `data/` en desarrollo), separados del inventario y las preferencias.

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Operación e indexación nocturna](docs/operacion.md)
- [Plan de versiones](docs/roadmap.md)
- [Plan de trabajo](docs/plan-de-trabajo.md)
- [Sistema de diseño](docs/sistema-de-diseno.md)
- [Registro de cambios](CHANGELOG.md)

## Versionado

Cada versión se marca con una etiqueta de Git (`v0.18.0`). Los ejecutables no se archivan: una versión anterior se reconstruye con `git checkout v0.18.0` y `npm run package`.

Con los flujos de `tools/ci/` copiados a `.github/workflows/`, en GitHub cada push corre las pruebas en Windows y las de interfaz en Linux (`ci.yml`) y deja el portable como artefacto. Al subir una etiqueta `vX.Y.Z`, `release.yml` arma el portable y publica la versión con sus notas de `CHANGELOG.md`; la aplicación consulta esa publicación (repositorio en `gml.releases` de `package.json`) y avisa cuando hay una más nueva.

Se usa versionado semántico: `MAYOR.MENOR.PARCHE`. Los cambios incompatibles incrementan MAYOR; las funciones nuevas compatibles, MENOR; las correcciones, PARCHE.
