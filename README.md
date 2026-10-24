# Games Meta Launcher

Lanzador local para Windows que reúne juegos detectados en Steam, Epic Games, Xbox/Microsoft Store, Ubisoft Connect, EA app y GOG Galaxy en una sola biblioteca. El encabezado conserva un guiño retro; los controles priorizan una interfaz de escritorio clara.

## Estado

Versión `0.26.0`. Detecta instalaciones locales y las reúne con tu cuenta de Steam, sin repetir juegos comprados en varias tiendas. Inicio propone qué jugar con una imagen principal y filas por intención. La Biblioteca tiene dos vistas (Portadas y Tabla), orden visible y filtros por tienda, género, duración, tiempo jugado, valoración y etiquetas. Cada juego tiene su página con arte, logo, descripción en español cuando Steam la ofrece, tiempo jugado y logros. Al jugar aparece una pantalla «Iniciando…» y la ventana se minimiza. Se usa con mouse, teclado o mando, y tiene un modo sala para la TV y el mando (F11 o el botón Menú). Suma los juegos de MAME como una tienda más, Arcade, con versiones regionales agrupadas y arte de libretro. La información ampliada de IGDB sigue en beta.

## Uso rápido

1. Generá el portable con `npm run package` y abrí `releases/Games Meta Launcher 0.26.0.exe`, o ejecutá `npm run desktop` durante el desarrollo.
2. En **Inicio**, elegí el juego destacado o uno de las filas. Un clic en una portada abre la página del juego; Jugar lo inicia.
3. En **Biblioteca**, buscá, ordená y filtrá. Por defecto se muestran los juegos instalados; «Toda la cuenta» suma los de Steam sin instalar.
4. En **Configuración**, elegí el tema, si la ventana se minimiza al jugar y la pantalla grande; conectá Steam e IGDB; programá la búsqueda nocturna y respaldá tus preferencias.
5. Con un mando, apretá Menú (o F11 en el teclado) para pasar al **modo sala**: pantalla completa, filas grandes y el arte del juego de fondo. A elige, B vuelve, X marca favorito, Y salta de letra en la Biblioteca, LB/RB cambian de sección y Menú abre las opciones (incluida la salida).

La versión portable incluye su propio runtime. Para desarrollo se requiere `npm install`.

## Desarrollo

| Comando           | Acción                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `npm start`       | Inicia la interfaz local.                                                                                |
| `npm run scan`    | Reconstruye el inventario sin abrir la interfaz.                                                         |
| `npm run check`   | Comprueba la sintaxis de los archivos de aplicación.                                                     |
| `npm test`        | Ejecuta las pruebas automáticas de la API y el indexador.                                                |
| `npm run format`  | Formatea el código con Prettier.                                                                         |
| `npm run desktop` | Abre la aplicación en una ventana de escritorio.                                                         |
| `npm run package` | Genera el portable de Windows y lo guarda en `releases/`. Conserva sólo la versión actual y la anterior. |

El inventario generado se guarda en `data/library.json`, que no forma parte del repositorio porque representa el estado de esta PC. Tus favoritos, etiquetas, progreso, notas, puntuaciones, portadas y fecha de última vez jugado se guardan localmente en `data/preferences.json` y `data/covers/`, también excluidos del repositorio. La fecha de juego se registra al iniciar un título desde Games Meta Launcher. La aplicación portable guarda esos datos en el perfil local de Windows.

## Arcade (MAME)

En **Configuración → Arcade (MAME)**, pegá la ruta de `mame.exe` y elegí **Guardar y buscar juegos**. El launcher:

1. Lee la descripción de las máquinas con `mame -listxml` (una vez por versión de MAME y conjunto de archivos; se guarda en `mame-<versión>.json`).
2. Lee el índice de cada `.zip` de las carpetas de `rompath` de tu `mame.ini`, sin descomprimir, y verifica cada set por CRC, incluidos padre, BIOS por defecto y dispositivos. Los `.zip` que no cambiaron no se vuelven a leer (`arcade-zips.json`).
3. Descarta BIOS, dispositivos, máquinas mecánicas, utilidades, sets incompletos y emulación preliminar. Oculta el contenido para adultos, casino y mahjong salvo que se active en Configuración.
4. Agrupa las versiones regionales bajo un juego, con la versión mundial o de EE. UU. adelante, y suma género, saga y ranking desde `catver.ini`, `series.ini` y `bestgames.ini` de [AntoPISA/MAME_SupportFiles](https://github.com/AntoPISA/MAME_SupportFiles) (se descargan cada 30 días a `mame-support/`; si la descarga falla se usa la copia anterior o la incluida en `src/mame-support/`, y Configuración lo informa).

Las portadas son los flyers de la máquina, la imagen principal una captura en pixel art y el logo el de la máquina, desde [libretro-thumbnails/MAME](https://github.com/libretro-thumbnails/MAME), o desde las carpetas `flyers`, `snap` y `logo` de tu MAME si existen. Se guardan en `art-cache`.

Después de indexar, cada juego de Arcade se busca en Wikipedia: el artículo en inglés lleva a Wikidata, que confirma que sea un videojuego del año correcto y aporta el identificador de IGDB y el artículo en español. La introducción en español se muestra como descripción (con enlace al artículo) y, si IGDB está conectado, el juego recibe su ficha (valoración, capturas, videos) como los de PC; sin identificador de Wikidata, IGDB sólo acepta el mismo título en la plataforma Arcade. Se guarda en `arcade-info.json` y se renueva cada 30 días. Con más de 300 juegos, sólo se buscan los favoritos y los jugados. Los juegos de pelea suman **Movimientos** desde `command.dat`.

Jugar abre `mame.exe <set>` desde la carpeta de MAME, así que usa tu configuración. Al cerrar MAME, la ventana vuelve al frente y se suma el tiempo jugado (`playSeconds` en las preferencias). En la Biblioteca, el selector **PC · Arcade · Todo** separa las colecciones; Inicio suma la fila **Clásicos del arcade**.

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

Se usa versionado semántico: `MAYOR.MENOR.PARCHE`. Los cambios incompatibles incrementan MAYOR; las funciones nuevas compatibles, MENOR; las correcciones, PARCHE.
