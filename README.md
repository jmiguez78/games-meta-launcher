# Viciódromo

**El lugar donde se vicia.** Todos tus juegos de PC en una sola biblioteca: Steam, Epic Games, Xbox / Microsoft Store, Ubisoft Connect, EA app, GOG Galaxy y arcade (MAME), con tu tiempo jugado, tus capturas y un modo sala para jugar en la TV con el mando.

Es un lanzador para Windows, portable (no se instala) y sin publicidad ni telemetría. Está en español. Hasta la versión 0.35.0 se llamó Games Meta Launcher.

## Descarga y requisitos

- **Windows 10 u 11 de 64 bits.** No corre en Windows ARM, Linux ni Steam Deck.
- Bajá `Viciodromo-<versión>.exe` desde [Releases](https://github.com/jmiguez78/viciodromo/releases) y abrilo. No necesita instalación ni permisos de administrador; trae todo lo que necesita.
- El ejecutable no está firmado: la primera vez, Windows puede mostrar «Windows protegió tu PC». Tocá **Más información → Ejecutar de todas formas**.
- La primera apertura tarda unos segundos mientras se descomprime (se ve una imagen de bienvenida).

## Qué hace

- **Encuentra tus juegos instalados** en todas las unidades de la PC, en las seis tiendas (ver [cómo los encuentra](docs/operacion.md#cómo-se-encuentran-los-juegos-instalados)), y los junta con tu cuenta de Steam sin repetir los que compraste en varias tiendas.
- **Inicio propone qué jugar**, con una imagen principal y filas por intención: Continuar, Favoritos, Instalados sin estrenar, Para una sesión corta, Lo mejor valorado, Clásicos del arcade y Para instalar.
- **Biblioteca** en portadas o en tabla, con búsqueda, orden y filtros por tienda, género, duración, tiempo jugado, valoración y etiquetas. Aguanta miles de juegos.
- **Página de cada juego** con arte, logo, descripción en español, logros de Steam, ficha de IGDB, tus notas y **tus capturas y videos**.
- **Jugar** abre el juego desde su tienda; la ventana se minimiza y, al cerrar el juego, vuelve con la duración de la sesión.
- **Tu actividad**: horas por semana, racha, los más jugados y las últimas sesiones, medidas en todas las tiendas.
- **Listas propias**, manuales o automáticas (una búsqueda guardada que se completa sola), como filas en Inicio.
- **Arcade (MAME)** como una tienda más: verifica tus ROMs, agrupa versiones regionales y suma arte, descripciones y movimientos.
- **Modo sala** para la TV y el mando (F11 o el botón Menú).
- **Búsqueda nocturna** opcional, para que los juegos nuevos aparezcan solos.
- Tema oscuro y claro, uso con mouse, teclado o mando, y respaldo de tus preferencias.

## Primeros pasos

1. Abrí Viciódromo. **Primeros pasos**, en Inicio, muestra los juegos encontrados por tienda y lo que falta conectar; se oculta al completarlo o con «Ocultar».
2. Opcional: en **Configuración**, conectá tu cuenta de **Steam** (SteamID64 y una clave de la Steam Web API) para sumar los juegos que no tenés instalados, tus horas y logros; **IGDB** (una aplicación gratuita de Twitch) para fichas ampliadas; y **Arcade**, con la ruta de tu `mame.exe`.
3. En **Inicio**, elegí el juego destacado o uno de las filas. Un clic en una portada abre la página del juego; **Jugar** lo inicia.
4. En **Biblioteca**, buscá, ordená y filtrá. Por defecto se muestran los instalados; «Toda la cuenta» suma los de Steam sin instalar.
5. En **Configuración**, elegí el tema, si la ventana se minimiza al jugar, programá la búsqueda nocturna, revisá tus carpetas de capturas y respaldá tus preferencias.
6. Armá **listas propias** desde la página de un juego («Listas») o con el botón **Listas** de la Biblioteca.
7. Con un mando, apretá Menú (o F11) para el **modo sala**: A elige, B vuelve, X marca favorito, Y salta de letra en la Biblioteca, LB/RB cambian de sección, Vista (⧉) alterna entre los juegos listos para jugar y toda la colección, y Menú abre las opciones (incluida la salida).

## Tus capturas y videos

La pestaña **Tus capturas** de cada juego muestra las imágenes y los videos que sacaste jugando, de la más nueva a la más vieja, con un visor a pantalla completa y «Mostrar en la carpeta». Inicio suma la fila **Tus últimas capturas** (sólo imágenes). Se leen de donde las guarda cada programa, sin copiarlas:

- **Steam** (F12), por número de juego.
- **Xbox Game Bar** y el **botón de captura del mando**, en la carpeta «Capturas» de Windows aunque la hayas movido a otra unidad, con sus subcarpetas. Los videos `.mp4` también; los `.jxr` (HDR) se ignoran porque Game Bar guarda al lado una copia `.png`.
- **NVIDIA** y la carpeta **Videos**, con una subcarpeta por juego o archivos con su nombre.
- **MAME** (F12), por set, según tu `mame.ini`.
- Las carpetas que agregues en **Configuración → Tus capturas**.

Los videos se reproducen por partes, así que uno de varios GB arranca enseguida. El detalle de cada fuente está en [Operación](docs/operacion.md#tus-capturas).

## Sesiones y «Tu actividad»

Al iniciar un juego, el launcher vigila su carpeta de instalación (en Windows, consultando los procesos cada pocos segundos mientras espera y cada 15 s durante el juego). La sesión empieza cuando aparece un proceso que corre desde esa carpeta y termina cuando deja de verse dos veces seguidas; los reportes de errores, instaladores y antitrampas no cuentan. Si el juego no aparece en 4 minutos (por ejemplo, un lanzador que pide actualizar), esa sesión no se mide. Al cerrarse, la ventana vuelve al frente, aparece un aviso con la duración y se guarda en `sessions.json` (versión de esquema 1, hasta 5.000 sesiones). Arcade se mide como antes, viendo cerrarse a MAME.

**Tu actividad** suma las horas por semana (lo medido por el launcher), las últimas dos semanas (con las horas que informa Steam, también las jugadas fuera del launcher), los más jugados (horas de Steam o medidas), la racha de días seguidos y las últimas sesiones.

## Listas propias

Una lista es **manual** (los juegos que elegís, en el orden en que los agregás) o **automática** (guarda la búsqueda de la Biblioteca: colección, alcance, texto, filtros y orden; sus juegos se calculan cada vez con las mismas reglas). Se administran desde **Biblioteca → Listas** (crear, renombrar, mostrar u ocultar en Inicio, borrar con «Deshacer») y la paleta (Ctrl K). «Ver todo» en una fila de Inicio abre la Biblioteca con sólo esa lista, y la búsqueda y los filtros se aplican sobre ella. Se guardan en `preferences.json` (hasta 50 listas) y viajan con el respaldo.

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

## Tus datos y el portable

Viciódromo guarda todo en tu PC: preferencias, sesiones, listas, portadas propias, las fichas descargadas y las claves de Steam e IGDB, cifradas con Windows DPAPI para tu usuario.

Los datos pueden viajar con el ejecutable, en la carpeta `Viciódromo - datos` junto al `.exe`:

- si esa carpeta existe, se usa;
- si no, y la PC ya tiene datos en el perfil de Windows (`%APPDATA%\Viciódromo`), se siguen usando esos. **Configuración → Datos del portable → Guardar junto al .exe** los copia (sin las cachés del navegador interno) y vuelve a abrir el launcher; la copia del perfil queda como respaldo;
- en una PC sin datos, se crea la carpeta junto al `.exe` si se puede escribir ahí.

Las claves cifradas no se pueden abrir en otra PC ni con otro usuario: la biblioteca sigue funcionando, el launcher avisa al abrir y Configuración pide volver a conectarlas.

**Si venís de Games Meta Launcher** (0.35.0 o anterior): al abrir la 0.36.0 por primera vez, lo que había en `%APPDATA%\Games Meta Launcher` se copia a `%APPDATA%\Viciódromo` (la carpeta vieja queda como respaldo), la carpeta `Games Meta Launcher - datos` junto al `.exe` se renombra y la búsqueda nocturna pasa al nombre nuevo con el mismo horario. Los respaldos de preferencias anteriores se siguen pudiendo restaurar.

## Privacidad

No hay telemetría ni cuentas propias. Las únicas conexiones son a Steam, IGDB, Wikipedia y Wikidata (fichas, arte y descripciones) y a GitHub (arte de libretro, archivos de soporte de MAME y aviso de versión nueva). El servidor interno sólo escucha en tu PC (`127.0.0.1`). El diagnóstico que se exporta desde Configuración no incluye claves, notas ni datos personales.

## Desarrollo

Se necesita Node.js 22 y `npm install`. La interfaz es HTML, CSS y JavaScript sin compilación; la aplicación de escritorio usa Electron.

| Comando           | Acción                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| `npm start`       | Inicia la interfaz local en el navegador.                                                                |
| `npm run desktop` | Abre la aplicación en una ventana de escritorio.                                                         |
| `npm run scan`    | Reconstruye el inventario sin abrir la interfaz.                                                         |
| `npm run check`   | Sintaxis de todo el código, `import` de la interfaz y reglas de los estilos.                             |
| `npm test`        | Pruebas automáticas del servidor, los módulos y las herramientas (`node:test`).                          |
| `npm run test:ui` | Pruebas de interfaz con Playwright: pantallas, flujos, accesibilidad y capturas de referencia.           |
| `npm run verify`  | Todo lo anterior, como la integración continua. Conviene correrlo antes de etiquetar una versión.        |
| `npm run format`  | Formatea el código con Prettier.                                                                         |
| `npm run package` | Genera el portable de Windows y lo guarda en `releases/`. Conserva sólo la versión actual y la anterior. |

La primera vez, `npx playwright install chromium` descarga el navegador de las pruebas de interfaz. Si un cambio visual es intencional, `npm run test:ui -- --update-snapshots` actualiza las capturas de referencia (`test/ui/capturas/`).

En desarrollo, los datos se guardan en `data/` (excluida del repositorio): el inventario `library.json`, las preferencias y el resto de los archivos del perfil.

## Bibliotecas grandes

La búsqueda usa un índice armado una vez por juego y la Biblioteca dibuja las portadas por lotes (las primeras 96 y el resto al desplazarse; Fin dibuja todas). Con 2.000 juegos, cada tecla redibuja en menos de 30 ms; una prueba de interfaz lo controla. Las cantidades del panel de filtros sólo se calculan con el panel abierto.

## Tareas en segundo plano

Buscar juegos, sincronizar Steam, indexar los dos MAME, Wikipedia e IGDB pasan por una sola fila: corren de a una, por prioridad, y pedir dos veces la misma no la duplica. La interfaz no sondea: escucha `/api/events` (eventos del servidor) y recibe el avance (al pie de la barra lateral), un aviso cuando cambian los datos de la biblioteca y cada sesión medida.

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Operación: búsqueda de juegos, capturas, tarea nocturna y datos](docs/operacion.md)
- [Plan de versiones](docs/roadmap.md)
- [Plan de trabajo](docs/plan-de-trabajo.md)
- [Sistema de diseño](docs/sistema-de-diseno.md)
- [Registro de cambios](CHANGELOG.md)

## Versionado y publicación

Se usa versionado semántico (`MAYOR.MENOR.PARCHE`) y cada versión se marca con una etiqueta de Git (`v0.36.0`). Los ejecutables no se archivan en el repositorio: una versión anterior se reconstruye con `git checkout v0.36.0` y `npm run package`.

En GitHub, cada push corre las pruebas en Windows y las de interfaz en Linux y deja el portable como artefacto (`.github/workflows/ci.yml`). Al subir una etiqueta `vX.Y.Z`, `release.yml` arma el portable y publica la versión con sus notas del registro de cambios; la aplicación consulta esa publicación (`gml.releases` en `package.json`) y avisa cuando hay una más nueva.

## Aviso legal y créditos

Viciódromo es un proyecto personal e independiente, sin relación con Valve (Steam), Epic Games, Microsoft (Xbox), Ubisoft, Electronic Arts, CD PROJEKT (GOG), NVIDIA, IGDB/Twitch ni el proyecto MAME, y sin su respaldo. Los nombres y marcas mencionados pertenecen a sus dueños y se usan sólo para identificar las tiendas y servicios compatibles.

**Juegos y ROMs.** El launcher no incluye juegos, ROMs, BIOS ni otros archivos protegidos por derechos de autor, ni explica cómo conseguirlos: sólo abre lo que ya tenés instalado. Para Arcade, usá únicamente ROMs que tengas derecho a usar.

**Datos y arte de terceros.** Portadas, capturas, descripciones y fichas se descargan a tu PC desde sus fuentes y siguen sujetas a sus propias condiciones: Steam Web API, IGDB, Wikipedia y Wikidata (los textos de Wikipedia están bajo CC BY-SA y se muestran con enlace al artículo), libretro-thumbnails y los archivos catver.ini, series.ini, bestgames.ini y command.dat de AntoPISA/MAME_SupportFiles (con una copia incluida en `src/mame-support/`). Las tipografías Bricolage Grotesque e Inter se incluyen bajo la licencia SIL Open Font License (`public/fonts/`) y los íconos siguen el estilo de Lucide (licencia ISC). Gracias a todos esos proyectos.

**Licencia.** El código se distribuye bajo la licencia MIT; ver [LICENSE](LICENSE). Esa licencia no alcanza al contenido de terceros mencionado arriba.
