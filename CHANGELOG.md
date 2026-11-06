# Registro de cambios

## 0.36.2

Primera versión publicada como Viciódromo.

- **Avisos de terceros.** `THIRD_PARTY_NOTICES.md` detalla cada componente incluido (Electron, dependencias, tipografías, íconos) con su licencia, y lo que se descarga de terceros con sus condiciones. Viaja dentro del ejecutable, junto con `LICENSE`.
- **Los archivos de AntoPISA ya no vienen incluidos.** `catver.ini`, `series.ini`, `bestgames.ini` y `command.dat` no publican una licencia que permita redistribuirlos, así que se quitaron de la aplicación: se siguen descargando de su repositorio cada 30 días. Sin conexión la primera vez, Arcade funciona sin categorías, sagas, ranking ni movimientos hasta la próxima búsqueda, y Configuración lo avisa.
- **Repositorio.** `data/` se ignora entera (salvo el ejemplo). Los flujos de GitHub usan versiones que corren en Node 24 y las pruebas de interfaz quedan fijas en Ubuntu 24.04, para que un cambio de fuentes del sistema no rompa las capturas de referencia.

## 0.36.1

- **Repositorio público con el nombre nuevo.** El código está en [jmiguez78/viciodromo](https://github.com/jmiguez78/viciodromo), bajo la licencia MIT, con aviso legal y créditos. El aviso de versión nueva consulta ese repositorio (GitHub redirige el nombre anterior, pero así no depende de la redirección).
- **Documentación al día.** El README está pensado para quien llega al repositorio: descarga y requisitos, qué hace, primeros pasos, tus capturas y videos, tus datos, privacidad y, al final, desarrollo y aviso legal. Arquitectura, Operación, Sistema de diseño, Plan de versiones y Plan de trabajo cubren hasta la 0.36.
- Se quita `tools/ci/`, una copia vieja de los flujos de GitHub Actions: los que corren están en `.github/workflows/`.
- El acceso directo de desarrollo se llama «Viciódromo (desarrollo)».

## 0.36.0

**Games Meta Launcher ahora se llama Viciódromo:** el lugar donde se vicia.

- El nombre nuevo está en la ventana, la barra lateral, la imagen de bienvenida, los avisos, los archivos de respaldo y de diagnóstico, y la documentación. El ejecutable pasa a llamarse `Viciodromo-<versión>.exe`, sin tilde ni espacios, para que se pueda compartir y publicar en GitHub sin que cambie el nombre.
- **Tus datos no se pierden.** Windows guarda los datos en una carpeta con el nombre de la aplicación. Al abrir la 0.36.0 por primera vez, lo que había en `%APPDATA%\Games Meta Launcher` (preferencias, sesiones, listas, portadas, claves de Steam e IGDB, y lo que recuerda la interfaz) se copia a `%APPDATA%\Viciódromo`; la carpeta vieja queda como respaldo. En el portable, la carpeta `Games Meta Launcher - datos` junto al `.exe` se renombra a `Viciódromo - datos`.
- **La búsqueda nocturna se renombra.** La tarea «Games Meta Launcher - Indexación nocturna» se reemplaza por «Viciódromo - Búsqueda nocturna», con el mismo horario.
- Los respaldos de preferencias hechos con Games Meta Launcher se siguen pudiendo restaurar.
- El script de la tarea de desarrollo se guarda en UTF-8 con BOM, para que Windows PowerShell lea bien las tildes del nombre.

## 0.35.0

Tanda 1 del plan para liberar: el launcher encuentra los juegos de cualquier PC, no sólo los de la de desarrollo.

- **Sin rutas fijas.** Se revisan todas las unidades que existen en la PC (antes, una lista fija: C, D, E, F, G, H y K).
- **Steam donde esté instalado.** La carpeta de Steam sale del registro; antes, con Steam fuera de `C:\Program Files (x86)\Steam`, no aparecía ningún juego de Steam ni sus portadas locales. Las bibliotecas salen de `libraryfolders.vdf`, más `SteamLibrary` en cada unidad por si falta.
- **Xbox con sus bibliotecas reales.** Se lee `.GamingRoot`, el archivo donde la app Xbox anota en qué carpeta de cada unidad instala, más `XboxGames` (su nombre por defecto). Antes se buscaba sólo en tres carpetas fijas.
- **Ubisoft, GOG y EA desde el registro.** Ubisoft Connect da la carpeta y el número de cada juego, así que todos se pueden abrir (antes, sólo Anno 1800). GOG da el ejecutable real de cada juego, en lugar del primer `.exe` de la carpeta. EA da la carpeta de cada juego. Las carpetas habituales (`UbisoftLibrary`, `GOG Games`, `EA Games`…) siguen como respaldo, sin repetir juegos.
- **Rutas con tildes.** El registro se lee con PowerShell en UTF-8: una carpeta como `C:\Users\José\Videos` ya no llega rota (también para Tus capturas).
- Los juegos conservan su identificador: favoritos, notas y tiempo jugado no se pierden.

## 0.34.0

- **Tus videos.** La pestaña **Tus capturas** suma los videos `.mp4` y `.webm` que graba Xbox Game Bar (Win + Alt + G o el botón del mando), con las mismas reglas que las capturas: por carpeta o por nombre de archivo, y los de MAME («MAME_ Kung-Fu Master (World) [kungfum] ….mp4») por el set. Cada miniatura muestra un cuadro del comienzo y la duración; el visor los reproduce con sus controles y las flechas adelantan o atrasan. Los videos se sirven por partes, así que uno de varios GB arranca enseguida y se puede adelantar sin leerlo entero. El resumen dice cuántas capturas y cuántos videos hay («5 capturas y 2 videos»). La fila de Inicio sigue mostrando sólo imágenes, para no abrir decenas de videos cada vez que se entra.

## 0.33.1

- **Capturas del botón del mando.** Las capturas de Xbox Game Bar (también las del botón de captura del mando compatible con Xbox) se buscan en la carpeta «Capturas» de Windows aunque se haya movido a otra unidad (por ejemplo, `E:\Videos`), y ahora se leen también los archivos sueltos de `Videos` y las subcarpetas armadas a mano, hasta tres niveles. Una subcarpeta con el nombre del juego le da todas sus imágenes; si tiene otro nombre («Expedition 33»), cada archivo se asocia por el suyo («Clair Obscur_ Expedition 33 …»). Los `.jxr` (HDR) se ignoran porque Game Bar guarda al lado una copia `.png`.
- **Búsqueda nocturna: la causa real.** El script de desarrollo `tools/register-nightly-index.ps1` creaba la tarea con el mismo nombre que la aplicación y la reemplazaba: el índice de las 3:00 se guardaba en `data/` del proyecto y el launcher no veía los juegos nuevos. Ahora el script usa otro nombre, y la 0.33.0 ya reprograma la tarea de la aplicación al abrirse.

## 0.33.0

Tus capturas en el launcher, y una búsqueda nocturna que no se rompe al compilar una versión nueva.

- **Tus capturas.** Nueva pestaña **Tus capturas** en la página de cada juego, con las imágenes que sacaste jugando, de la más nueva a la más vieja: visor a pantalla completa, «Mostrar en la carpeta» y «Buscar de nuevo». En Inicio, la fila **Tus últimas capturas** junta las de todos los juegos. Se leen de donde las guarda cada programa, sin copiarlas: Steam (F12, por número de juego), MAME (F12, por set y según `snapshot_directory` de `mame.ini`), Xbox Game Bar (`Videos\Captures`, por el nombre del archivo) y NVIDIA (una carpeta por juego en `Videos` o `Videos\NVIDIA`). En **Configuración → Tus capturas** se ve qué carpetas se revisan y cuántas capturas hay en cada una, y se pueden sumar otras.
- **Búsqueda nocturna que se repara sola.** La tarea de Windows guarda la ruta del `.exe` que la programó, y `npm run package` borra los ejecutables viejos: la tarea seguía «activa», pero fallaba todas las noches sin avisar. Ahora, al abrir una versión nueva, la tarea se vuelve a crear con el mismo horario y el ejecutable actual. Configuración muestra cuándo corrió por última vez y si anduvo, y avisa si apunta a un ejecutable que ya no existe.

## 0.32.0

Tanda 4 del plan, «ambición»: listas propias, una biblioteca que aguanta miles de juegos y el tema claro y los errores revisados. Con esta tanda se completa el plan de 20 mejoras.

- **Listas propias (F9).** Manuales (desde la página de un juego, con «Listas») o automáticas: guardan una búsqueda de la Biblioteca con sus filtros y se completan solas. Hay ideas para empezar («Cortos sin estrenar», «Para el finde», «Arcade de a dos»). Las listas «En Inicio» aparecen como filas, con «Ver todo» para abrirlas en la Biblioteca. Se administran desde el botón **Listas** de la Biblioteca o la paleta, y viajan con el respaldo.
- **Biblioteca para miles (F6).** Índice de búsqueda y portadas dibujadas por lotes. Con 2.000 juegos, abrir la Biblioteca pasó de unos 460 ms a 20 ms y cada tecla de la búsqueda, de hasta 75 ms a menos de 15 ms. Las cantidades del panel de filtros se calculan sólo con el panel abierto.
- **Tema claro y estados de error (F10).** Inicio sin juegos o con error al cargar muestra un aviso con «Reintentar» o «Buscar juegos» en lugar de filas vacías, con su título y el buscador legible. Sin conexión con el launcher, los avisos lo dicen en palabras en lugar de un error técnico. Un error al cargar la biblioteca ya no queda como error sin atender de la página. Nuevas capturas de referencia (Tu actividad en tema claro, Inicio con error, Biblioteca vacía) y auditoría de accesibilidad de Tu actividad, Primeros pasos, Listas y el estado de error, en ambos temas.

## 0.31.0

Tanda 3 del plan, «experiencia»: el tiempo jugado de todas las tiendas, una pantalla para verlo, la primera vez guiada, tareas en segundo plano ordenadas y un portable que viaja con sus datos.

- **Sesiones para todas las tiendas (B6).** Al iniciar un juego de Steam, Epic, GOG, Xbox, EA o Ubisoft, el launcher vigila su carpeta de instalación y mide cuánto tiempo estuvo abierto. Al cerrarlo, la ventana vuelve al frente con un aviso («Sesión de 1 h 20 min en Hades») y el tiempo se suma al juego. La página del juego, Inicio y el modo sala muestran ese tiempo cuando Steam no lo informa.
- **Tu actividad (F8).** Nueva sección en la barra lateral: horas de esta semana y de las últimas dos (con las de Steam), racha de días seguidos, horas por semana de los últimos tres meses, los más jugados y las últimas sesiones. Un clic en un juego abre su página.
- **Tareas en segundo plano unificadas (B7).** Buscar juegos, Steam, los dos MAME, Wikipedia e IGDB corren en una sola fila, de a una y por prioridad. La interfaz deja de preguntar cada segundo: el servidor avisa el avance (al pie de la barra lateral), cuándo cambió la biblioteca y cada sesión medida. Una búsqueda de Arcade que termina con la aplicación en otra pantalla ahora también actualiza la biblioteca.
- **Primeros pasos (F1).** Una tarjeta en Inicio con tres pasos: los juegos encontrados por tienda, conectar Steam e IGDB, y sumar Arcade. Cada paso lleva directo a su lugar en Configuración. Desaparece al completarla o con «Ocultar».
- **Portable de verdad (B8).** Imagen de bienvenida mientras el portable se descomprime. Los datos pueden vivir junto al `.exe` (carpeta `Games Meta Launcher - datos`): se usa si existe, se crea en una PC nueva, y en una PC que ya tenía datos Configuración ofrece copiarlos. En otra PC, si las claves de Steam o IGDB no se pueden abrir, la biblioteca sigue funcionando y se avisa que hay que volver a conectarlas (antes, la biblioteca no cargaba).

## 0.30.3

- **Portadas que no aparecían.** Una portada que todavía se está descargando ya no ocupa una de las pocas conexiones del navegador: pasado un segundo y medio el servidor responde «descargando» y la portada se vuelve a pedir cuando está a la vista. Antes, al sumar muchos juegos nuevos (los del MAME alternativo), las portadas ya guardadas quedaban esperando detrás y se veían las iniciales.
- **Arcade: portadas con nombres cambiados.** libretro-thumbnails nombra las imágenes con la descripción de MAME de cuando se agregaron; si MAME la cambió («Double Dragon (World set 1)»), el nombre exacto no existe. Ahora se consulta la lista de cada carpeta (se guarda 30 días) y se usa el mismo título más parecido.

## 0.30.2

- La versión de MAME se reconoce también en ejecutables viejos que no responden a `-version` (se lee de `-help`).
- El resultado de cada búsqueda de Arcade, y su error si falla, queda en el registro de diagnóstico.

## 0.30.1

- El campo «MAME alternativo» ya no muestra una ruta de ejemplo que parecía un valor cargado: guardar con el campo así lo dejaba vacío.

## 0.30.0

- **MAME alternativo.** Configuración → Arcade acepta un segundo MAME, más viejo, con su propia carpeta de ROMs (por ejemplo `K:\Juegos\MAME64 - Legacy 0170\mame64.exe`). El launcher indexa esa carpeta con ese MAME y suma a la biblioteca sólo los juegos que el principal no tiene; los que corren en los dos se abren con el principal. Cada juego se abre automáticamente con el MAME que le corresponde y su ficha lo indica en «Emulador». La búsqueda nocturna y «Verificar de nuevo» revisan las dos carpetas; el ajuste de contenido para adultos es uno solo para ambos.

## 0.29.2

- El arte de Steam lee su caché una sola vez aunque lleguen muchos pedidos juntos. Antes cada pedido simultáneo leía el archivo por su cuenta, y en Windows el orden de las lecturas hacía fallar una prueba de vez en cuando.

## 0.29.1

- Las direcciones con barras invertidas o «..» codificados se rechazan igual en Windows y en Linux (403). En Windows la prueba esperaba 404 y fallaba, aunque el archivo tampoco se servía.

## 0.29.0

Tanda 2 del plan, «base para crecer»: una red de pruebas para cambiar sin miedo y una API más prolija. F2 (módulos) y F3 (estilos en capas) ya estaban hechas.

- **Integración continua (B10).** Flujos de GitHub Actions listos en `tools/ci/` (se copian una vez a `.github/workflows/`): cada push corre la revisión, el formato y las pruebas en Windows, las pruebas de interfaz en Linux y deja el portable como artefacto; al subir una etiqueta `vX.Y.Z` se publica la versión con sus notas de este registro.
- **Pruebas de interfaz en el repositorio.** `npm run test:ui` levanta la aplicación con una biblioteca inventada y prueba cada pantalla, los recorridos principales (buscar, favoritos, paleta, modo sala, arranque instantáneo, diagnóstico), la accesibilidad en ambos temas y siete capturas de referencia. Fallan si aparece un error de la página o un bloqueo de la política de contenido. `npm run verify` corre todo.
- **Aviso de versión nueva.** Configuración muestra la versión instalada y, si hay una publicada más nueva, un botón para ver las novedades; al abrir aparece un aviso una sola vez por versión. Se activa cuando el repositorio de GitHub tenga publicaciones.
- **Rutas declarativas (B5).** La API pasó de una función de 240 líneas a una tabla de rutas por dominio (`src/routes/`). Los errores de quien llama responden 400, 404, 405, 409 o 413 con un mensaje en español en lugar de 500; sólo lo inesperado queda como error en el registro.
- **Corrección:** el atajo «Ctrl K» del buscador no tenía contraste suficiente sobre la imagen principal en el tema claro (lo encontró la prueba de accesibilidad).
- `npm run check` revisa la sintaxis de todos los archivos sin una lista a mano.

## 0.28.0

Tanda 1 del plan, «blindaje»: datos protegidos, apertura más rápida y todo en español.

- **Escrituras seguras (B1).** Preferencias, fichas, inventario, ajustes, portadas propias y arte descargado se guardan primero en un archivo temporal y después se renombran: un corte de luz o un cierre a mitad de camino ya no deja archivos a medio escribir. Los cambios a un mismo archivo van en fila, así marcar favorito y calificar seguido nunca se pisan.
- **Caché en memoria (B2).** Los archivos se leen una vez y se reutilizan mientras no cambien; la biblioteca se arma una sola vez por cambio. En una prueba con 280 juegos, pedir la biblioteca pasó de unos 20 ms a 4 ms y 60 portadas locales, de 750 ms a 95 ms.
- **Electron endurecido (B3).** Política de contenido estricta, `sandbox`, sin navegación fuera de la interfaz, sólo el permiso de pantalla completa e instancia única: abrir el .exe otra vez trae la ventana al frente en lugar de abrir otra con su propio servidor. Puerto fijo, para que la vista, la colección y el modo sala elegidos se recuerden de verdad entre aperturas.
- **Registro de diagnóstico (B4).** Errores del servidor y de la interfaz, juegos iniciados, búsquedas y migraciones quedan en `logs/gml.log` del perfil (rota al pasar 1 MB). Configuración → Mantenimiento → «Exportar diagnóstico» arma un archivo para compartir, sin claves ni datos personales.
- **Datos versionados (B9).** `preferences.json` (versión 1) y `metadata.json` (versión 3) llevan versión de esquema; antes de migrar se deja una copia (`preferences.v0.bak.json`). `metadata.json` ya no guarda la respuesta completa de IGDB: con la biblioteca actual pasa de 11,4 MB a 2,5 MB.
- **Arranque instantáneo (F4).** La última biblioteca se guarda en el navegador y se muestra al abrir mientras se pide la actual; si no cambió, no se redibuja nada.
- **Todo en español (F5).** Géneros, temáticas, modos y perspectivas de IGDB y las categorías de MAME («Disparos / Vuelo vertical») se muestran en español en filtros, fichas, Inicio y modo sala.

## 0.27.0

Estilos en capas (F3). Sin cambios visibles: se verificó con los estilos calculados de cada elemento y capturas de 55 estados (temas oscuro, claro y del sistema, tres anchos de ventana, movimiento reducido y modo sala) antes y después.

- Las cuatro hojas que se pisaban entre sí (`style.css`, `ui.css`, `experience.css` y `couch.css`, 4.437 líneas) pasan a seis hojas ordenadas con `@layer` en `public/styles/`: tokens, base, componentes, pantallas, modo sala y utilidades. `public/styles.css` declara el orden y las importa.
- Cada selector se define una sola vez, en la sección de su componente o pantalla. Se quitaron las declaraciones que nunca tenían efecto porque otra regla las pisaba siempre.
- Sin `!important`: lo que tiene que ganar siempre (ocultar, estado inválido, movimiento reducido) vive en la última capa.
- Los colores sueltos pasan a tokens con nombre: una paleta fija para lo que es oscuro por diseño (barra lateral, portadas sin imagen por tienda, avisos, botones del mando) y canales para las transparencias.
- `npm run check` revisa que no vuelvan los colores sueltos, los `!important` ni los selectores repetidos (`tools/check-styles.mjs`).
- Con «reducir movimiento» activado, los botones de las portadas ya no se animan (antes una regla más específica lo impedía).

## 0.26.1

- Modo sala: arranca mostrando solo los juegos **listos para jugar** (instalados y con lanzador). El botón Vista del mando (⧉), la tecla V o el chip de arriba a la derecha cambian a **toda la colección**; la elección se recuerda.
- Con toda la colección, la Biblioteca muestra primero lo instalado y después un bloque «Sin instalar», atenuado y con etiqueta; Inicio suma la fila «Para instalar».
- Los nombres largos ya no se cortan en el título del modo sala.

## 0.26.0 — 24 de octubre de 2026

Modo sala (mejora F7 del plan): la pantalla grande pasa a ser una experiencia propia para la TV y el mando.

- Pantalla completa con el arte del juego enfocado de fondo, sus datos arriba (motivo, logo, fabricante o tienda, última sesión, horas, crítica) y filas grandes abajo. La fila enfocada sube a un lugar fijo y el riel se corre solo, así el juego elegido siempre queda a la vista.
- Inicio con «Destacados» y las filas de siempre, sin repetir juegos. Biblioteca con todos los juegos en filas por letra; Y salta a la letra siguiente.
- A abre una ficha grande con Jugar adelante, favorito y volver; B vuelve; X marca favorito; LB/RB cambian entre Inicio y Biblioteca; Menú abre las opciones, incluida «Salir del modo sala». Ayuda de botones abajo, con los colores del mando.
- También con teclado (flechas, Enter, Escape, F11) y mouse; el puntero se esconde si no se mueve. Medidas relativas a la pantalla para verse bien en una TV 4K. Hora en la esquina.
- Se entra con F11, el botón Menú, la paleta o Configuración → «Modo sala», y se recuerda entre sesiones. Salir de la pantalla completa ya no cierra el modo sala.
- Reemplaza al modo «Pantalla grande» anterior, que agrandaba la interfaz de escritorio un 30 %.

## 0.25.0 — 24 de octubre de 2026

Interfaz en módulos (mejora F2 del plan). No cambia nada de lo que se ve.

- `public/app.js` (3.197 líneas) y `public/steam-ui.js` se dividen en 17 módulos ES en `public/js/`, uno por responsabilidad: Inicio, Biblioteca, página del juego, ficha, Configuración, paleta, Steam, portadas, avisos y otros. Sin herramientas de compilación.
- Cada módulo declara lo que usa de los demás (`import`) y lo que ofrece (`export`). Los enlaces de eventos de cada pantalla viven en su módulo, dentro de `setup()`, y `main.js` los activa en orden al arrancar.
- `npm run check` verifica la sintaxis de cada módulo y que cada `import` exista en su origen.
- Verificado con los recorridos de interfaz de las versiones anteriores (Inicio, Biblioteca, página del juego, mando, paleta, edición, Arcade y movimientos) y con la auditoría de accesibilidad: sin errores ni cambios visuales.

## 0.24.0 — 24 de octubre de 2026

Arcade con información como la de los juegos de PC.

- Descripción en español desde Wikipedia: se busca el artículo del juego, se confirma en Wikidata que sea un videojuego del año correcto y se muestra la introducción del artículo en español, con enlace. Si no hay artículo confiable, no se adivina.
- IGDB también para Arcade: con el identificador que da Wikidata, o con una búsqueda limitada a la plataforma Arcade que sólo acepta el mismo título y un año cercano. Así los arcades suman valoración de la crítica, capturas, videos y juegos relacionados, y entran en «Lo mejor valorado».
- Movimientos: los juegos de pelea muestran los comandos de cada personaje (flechas, botones, agarres y especiales) desde `command.dat`, con los nombres de los botones en español.
- La búsqueda de información corre después de cada verificación de Arcade, de a un juego por vez, y se recuerda 30 días. Configuración muestra el avance.

## 0.23.1 — 24 de octubre de 2026

- Biblioteca: la barra de búsqueda, colección, orden, filtros y vista queda fija arriba al bajar, con fondo translúcido. El panel de filtros y el foco de teclado o mando se ubican debajo de ella.
- Arcade: si no se pueden descargar las categorías, el ranking o las sagas, se usa la copia anterior o una incluida en la aplicación, y Configuración dice cuál falló y por qué. Sin categorías no se podían ocultar los juegos de casino y mahjong ni las utilidades.
- Arcade: los fabricantes desconocidos ya no se muestran como «<unknown>».

## 0.23.0 — 24 de octubre de 2026

Arcade: los juegos de MAME como una tienda más.

- Configuración → Arcade (MAME): con la ruta de `mame.exe`, el launcher verifica cada set de tu carpeta por CRC (sin descomprimir ni correr MAME para eso) y muestra sólo los que arrancan con tu versión. Con el set actual: 1.414 juegos listos de 6.910 archivos, y un resumen de por qué no arrancan los demás.
- Un juego por grupo de versiones, con la versión mundial o de EE. UU. adelante y nombre limpio («Pac-Man», no «pacman.zip»). Las versiones regionales se juegan desde la página del juego. Títulos repetidos se distinguen por fabricante y año.
- Fuera por defecto: BIOS, dispositivos, máquinas mecánicas, utilidades, emulación preliminar y contenido para adultos, casino y mahjong (este último se puede activar).
- Biblioteca: selector PC · Arcade · Todo (por defecto PC) y filtros nuevos de década y jugadores. Bajo cada portada de arcade, fabricante y año.
- Inicio: fila «Clásicos del arcade» con los mejor rankeados de `bestgames.ini`, en un orden que cambia cada día. Lo jugado en arcade entra en «Continuar».
- Página del juego: datos de la máquina (fabricante, año, saga, categoría, jugadores, controles, pantalla, estado de emulación), versiones con su botón Jugar e imágenes de pantalla de título y juego.
- Arte: flyers como portada, capturas en pixel art nítido como imagen principal y logos, desde libretro-thumbnails o desde las carpetas de arte de tu MAME.
- Jugar abre MAME con tu configuración; al cerrarlo, la ventana vuelve al frente y se suma el tiempo jugado.
- La búsqueda nocturna también vuelve a verificar Arcade (rápido: sólo relee los `.zip` que cambiaron).
- Corrección: la búsqueda nocturna programada desde el ejecutable portable apuntaba a una copia temporal que se borra al cerrar; ahora usa la ruta real del `.exe`.

## 0.22.2 — 24 de octubre de 2026

- Página del juego → Multimedia: la tira de capturas ya no desborda la pantalla hacia la derecha. Queda dentro de la columna principal, se desplaza por dentro y tiene flechas (como las filas de Inicio) que aparecen sólo si hay más capturas de las que entran.

## 0.22.1 — 24 de octubre de 2026

Correcciones.

- Portadas faltantes: Steam publica el arte renovado de muchos juegos en una dirección nueva, y la anterior responde «no existe». Ahora se consulta a la tienda de Steam la dirección vigente de cada imagen (en lotes de 50 y guardada en `steam-assets.json`). La dirección clásica, IGDB y la cabecera horizontal quedan como respaldo.
- Los juegos de la cuenta que no están instalados también usan el arte que el cliente de Steam ya guardó en esta PC, antes de descargar nada.
- Las imágenes descargadas siguen guardándose en `art-cache` y no se vuelven a pedir.

## 0.22.0 — 24 de octubre de 2026

Segunda ronda, etapa D: mando y pantalla grande.

- Navegación con mando: cruceta o palanca para moverse, A para elegir (sobre un juego abre su página), B para volver, X para marcar favorito, Y para buscar, LB y RB para cambiar de sección y Menú para la pantalla grande. Mantener una dirección repite el movimiento.
- Donde ninguna pantalla usa las flechas, el foco salta al elemento más cercano en esa dirección. Con el mando, el foco se resalta para verse desde lejos.
- Pantalla grande: todo un 30 % más grande y la ventana a pantalla completa. Se activa con F11, con Menú, desde la paleta o en Configuración → General.
- Al abrir la página de un juego, el foco queda en Jugar.

## 0.21.0 — 24 de octubre de 2026

Segunda ronda, etapa C: el momento de jugar.

- Al apretar Jugar aparece de inmediato una pantalla con el arte y el logo del juego y «Iniciando en Steam…» (o la tienda que corresponda). Cuando la tienda confirma, pasa a «Listo. Que lo disfrutes.» y se cierra sola. También se cierra con un clic o Escape.
- La ventana se minimiza al iniciar un juego para que quede adelante. Se puede desactivar en Configuración → General → «Al iniciar un juego».
- El aviso «inicio solicitado» se reemplaza por esa pantalla.

## 0.20.0 — 24 de octubre de 2026

Segunda ronda, etapa B: Configuración ordenada.

- Configuración pasa de un mosaico de tarjetas a tres secciones (General, Cuentas e información y Mantenimiento), con la explicación a la izquierda y los controles a la derecha.
- Con Steam o IGDB conectados se ve el estado en una línea («Conectada: 279 juegos, sincronizada hace 3 h») y las acciones. Los campos de credenciales quedan ocultos hasta elegir «Cambiar de cuenta».
- El tema oscuro aparece primero entre las opciones de apariencia.
- Los campos de texto tienen bordes con contraste suficiente en el tema claro.

## 0.19.0 — 24 de octubre de 2026

Segunda ronda, etapa A: una Biblioteca para encontrar cualquier juego en segundos.

- Dos vistas: Portadas y Tabla. Lista y Ficha se retiran, porque la página de cada juego cumple su función. La vista elegida se recuerda.
- El orden está a la vista junto a la búsqueda: nombre, jugados recientemente, más horas, mejor valorados, más cortos primero y tienda.
- Panel de filtros lateral con conteos: tienda, género, duración, tiempo jugado (incluye «Nunca jugado»), valoración y etiquetas, más «Sólo favoritos». Las opciones de un mismo grupo se suman y los grupos se combinan. El panel recuerda si quedó abierto.
- Tabla nueva: portada, nombre, tienda, estado, horas jugadas, última sesión (desde la aplicación o Steam), valoración y duración. Todas las columnas se ordenan, y Jugar e Instalar son botones de ícono.
- Un juego comprado en varias tiendas aparece una vez, con la copia jugable adelante. La portada indica en cuántas tiendas está, y la página del juego suma «También en» para abrir las otras copias.
- La búsqueda ignora tildes, combina palabras y reutiliza las portadas ya armadas: responde unas tres veces más rápido. Las portadas fuera de pantalla no se pintan hasta acercarse.
- Inicio tampoco repite juegos entre tiendas.
- La lógica de búsqueda, filtros, orden y duplicados vive en `public/catalog.js` y tiene pruebas automáticas.

## 0.18.0 — 24 de octubre de 2026

Fase 3 del plan de experiencia: una página propia para cada juego.

- Un clic en una portada, en una fila de Lista o Tabla, en «Ver ficha» de Inicio o Mayús+Enter en la paleta abre la página del juego. La portada se expande hasta convertirse en la cabecera.
- Cabecera de borde a borde con el arte panorámico y el logo del juego (desde la caché de Steam o su CDN), y los datos principales: plataforma, año, géneros y desarrolladora.
- Columna fija con Jugar o Instalar, Favorito y Editar, tiempo jugado, últimas dos semanas, última sesión, duración estimada, valoración, tu progreso y un anillo con el avance de logros de Steam.
- La descripción se muestra en español desde la tienda de Steam cuando existe; si no, la de IGDB, con una nota de que está en inglés.
- Pestañas subrayadas; las capturas se recorren en una tira horizontal.
- Los datos técnicos (unidad, ubicación, forma de inicio y detección) pasan a la sección «Instalación».
- Las pestañas Steam y Logros muestran un esqueleto mientras cargan.
- Volver o Escape regresan al lugar de origen y devuelven el foco al juego.
- En las portadas, Enter juega y Espacio abre la página. La vista Ficha de la Biblioteca suma «Abrir ficha completa».

## 0.17.0 — 24 de octubre de 2026

Fase 2 del plan de experiencia: un Inicio que propone qué jugar.

- Imagen principal a todo el ancho con el último juego que jugaste (en Steam o desde la aplicación), su logo, horas jugadas, última sesión y los botones Jugar, Ver ficha y Favorito. Las miniaturas de la derecha cambian entre cinco juegos destacados.
- Filas por intención con desplazamiento horizontal: Continuar, Favoritos, Instalados sin estrenar, Para una sesión corta, Lo mejor valorado de tu colección y Para instalar. Las filas vacías no aparecen, salvo Favoritos, que explica cómo marcar juegos.
- Con el teclado, las flechas izquierda y derecha recorren una fila; arriba y abajo pasan a la fila vecina.
- Las métricas con contadores salen de Inicio. El estado de la biblioteca pasa a Configuración, y la sección de revisión aparece en la barra lateral sólo cuando hay juegos que necesitan atención, con su cantidad.
- «Actualizar» y la hora de la última indexación se reemplazan por «Buscar juegos nuevos» y «Biblioteca actualizada hace 3 h» al pie de la barra lateral.
- La selección de juegos para Inicio vive en `public/shelves.js` y tiene pruebas automáticas.

## 0.16.0 — 24 de octubre de 2026

Fase 1 del plan de experiencia: identidad visual.

- Tema oscuro como base, con una paleta de tinta violeta que deja el color al arte de cada juego. El tema claro se rediseñó con los mismos tokens.
- El fondo toma el color del juego que estás mirando: al pasar el mouse o moverte con el teclado, el brillo ambiental cambia suavemente.
- Tipografías incluidas en la aplicación: Bricolage Grotesque para títulos e Inter para la interfaz. Ya no dependen de lo que tenga instalado Windows.
- Portadas sin marco: la imagen es la tarjeta. Al pasar el mouse se elevan con un brillo del color del juego y muestran Jugar.
- Jugar usa un coral propio en toda la aplicación; los demás botones principales usan tinta invertida.
- Barra lateral angosta con íconos, que se expande al pasar el mouse o al llegar con el teclado. Marca e ícono nuevos.
- Títulos en oración y sin rótulos en mayúsculas; transición breve al cambiar de página. Todo el movimiento se desactiva si Windows pide reducirlo.

## 0.15.0 — 24 de octubre de 2026

Fase 0 del plan de experiencia: correcciones visibles.

- La Biblioteca abre con los juegos instalados. Un selector junto a la búsqueda cambia a toda la cuenta de Steam y muestra cuántos juegos hay en cada caso.
- «No instalado» se muestra en gris con un aro, en lugar del verde de «Listo». «Requiere revisión» sigue en ámbar.
- La lista de la vista Ficha muestra la portada de cada juego; antes quedaban las iniciales. La paleta de comandos también muestra portadas.
- Nombres limpios: se quitan sufijos de tienda como «- Windows» o «PC Edition» y las marcas ® y ™. El nombre original sigue sirviendo para buscar.
- La barra lateral queda fija al desplazar el contenido.
- La ventana se abre recién cuando la interfaz está lista, sin destello blanco, y con un ícono propio.
- El tema oscuro pasa a ser el predeterminado cuando no hay una elección guardada.
- La prueba de logos de Xbox funciona en cualquier sistema operativo.

## 0.14.2 — 23 de octubre de 2026

- Inicio rediseñado como un resumen breve y visual de la colección, con indicadores de juegos disponibles, favoritos y partidas en curso.
- Las vistas de Biblioteca ahora tienen una intención explícita: Portadas para descubrir, Lista para escanear, Ficha para profundizar y Tabla para comparar.
- Un clic o Enter sobre un juego en Lista o Tabla abre su Ficha. Las acciones de jugar, instalar, favorito y editar conservan su comportamiento directo.

## 0.14.1 — 23 de octubre de 2026

- Retirada la sección Steam del menú y su panel independiente de actividad, deseados, seguidos, recomendaciones y amigos. La navegación vuelve a Inicio, Biblioteca, Diagnóstico y Configuración.
- Sincronización de la biblioteca de Steam trasladada a Configuración, junto a la conexión de cuenta.
- Se conservan la biblioteca fusionada, los filtros de instalación, las cuatro vistas y los datos de actividad, logros, compatibilidad y tienda en las fichas.

## 0.14.0 — 23 de octubre de 2026

- Steam autónomo en el portable: MCP incluido, credenciales DPAPI, conexión manual o importación local y sincronización en segundo plano.
- Biblioteca de cuenta fusionada por App ID con instalaciones locales: filtros de instalación y acción para instalar mediante Steam.
- Horas totales y recientes, última actividad de Steam y colecciones por tiempo registrado.
- Logros completos con progreso, pendientes, fechas y rareza global; privacidad explícita y progreso personal independiente.
- Tienda, requisitos, idiomas, mando, compatibilidad, reseñas agregadas, evolución y noticias. Reseñas individuales cuando Steam las permite.
- Deseados con moneda verificada, descuentos, seguidos y recomendaciones; amigos, comparación de bibliotecas y amigos que poseen cada juego. Listas parciales identificadas.
- Caché por cuenta, conservación ante fallas de red, validación de biblioteca completa y carga diferida de portadas.

## 0.13.0 — 23 de octubre de 2026

- Ficha reorganizada en **Resumen**, **Información** y **Multimedia**, con navegación por flechas, Inicio y Fin. La pestaña elegida se conserva al cambiar de juego.
- Más espacio para la ficha en la vista Detalle y desplazamiento independiente de la lista y el panel en escritorio; en pantallas pequeñas vuelven a apilarse.
- Galería integrada para ampliar capturas e ilustraciones, recorrerlas con botones o flechas y cerrar con Escape, devolviendo el foco a la miniatura. Incluye estados de carga, error y reintento.
- Las fichas sin metadatos muestran mensajes claros. Los videos y enlaces siguen abriéndose externamente.
- Corregida la ubicación de las etiquetas personales y un cruce de selectores que podía sobrescribir datos de IGDB con detalles técnicos locales.
- Contexto visual registrado en `.21st/`; referencia pública de pestañas de 21st adaptada al HTML/CSS del proyecto. Revisión local de 21st sin errores ni advertencias.

## 0.12.0 — 23 de octubre de 2026

- Fichas de IGDB ampliadas: descripción completa, historia (plegada por posibles spoilers), temáticas, palabras clave, modos, perspectivas, plataformas, motores, colecciones, franquicias y nombres alternativos.
- Compañías con sus roles, idiomas separados por audio/subtítulos/interfaz, multijugador por plataforma, clasificaciones de edad y fechas por plataforma/región.
- Valoraciones de crítica y comunidad con cantidad de votos y duración estimada de IGDB cuando existe, con su cantidad de muestras.
- Galería de capturas e ilustraciones, videos, sitios web, DLC, expansiones, ediciones y juegos relacionados.
- Información organizada en secciones desplegables; se conservan las fichas anteriores hasta actualizar. La caché guarda la respuesta original de IGDB para futuras mejoras y la fecha de descarga.
- Autenticación real y descarga ampliada verificadas con los 50 juegos de la biblioteca local. El emparejamiento sigue en beta hasta revisar manualmente cada coincidencia.
- Las actualizaciones reutilizan los ID de IGDB conocidos (con prioridad al App ID exacto de Steam) y conservan la caché anterior si falla la consulta. Las credenciales de Twitch viajan en el cuerpo de la solicitud.

## 0.11.0 — 23 de octubre de 2026

- Paleta de comandos: **Control+K** o el botón **Buscar o ir a…** permiten abrir un juego por nombre, ir a cualquier sección o cambiar el tema, actualizar el inventario y otras acciones sin usar el mouse. **Mayús+Enter** abre la ficha del juego. La barra diagonal sigue enfocando la búsqueda de la Biblioteca.
- Avisos nuevos: se apilan sin interrumpir, muestran si algo está en curso, salió bien o falló, y ofrecen **Deshacer** al cambiar favoritos, guardar una ficha o restaurar un respaldo, y **Reintentar** cuando algo falla. Los errores ya no abren una ventana que hay que cerrar.
- Formularios más claros: los errores aparecen debajo del campo que hay que corregir, en la ficha del juego y en Configuración. La ficha avisa si la ruta de lanzamiento no tiene el formato correcto o si la portada no es una imagen válida, y no se cierra hasta guardar.
- En la ficha, Enter guarda los cambios (antes cerraba sin guardar) y la ruta de lanzamiento se deshabilita mientras se usa la detección automática.

## 0.10.0 — 23 de octubre de 2026

- Modo oscuro: sigue el tema de Windows o se elige en **Configuración → Apariencia**. La barra de título acompaña la elección.
- Información de juegos desde IGDB (beta, opcional): descripción, géneros, año, desarrolladora, valoración y portadas para Epic y Ubisoft. Requiere credenciales de una aplicación de Twitch y todavía no se validó contra el servicio real.
- Al restaurar un respaldo se conservan las preferencias de la aplicación.
- Interfaz renovada en todas las pantallas: portadas grandes, filas y ficha de juego rediseñadas, tabla ordenable accesible, íconos nuevos y estados de carga, error y biblioteca vacía.
- Navegación completa por teclado en cada colección (flechas, Enter, F y E) y mejoras de accesibilidad WCAG 2.2 AA en contraste, foco y etiquetas.
- Corregido el botón Actualizar, que podía quedar deshabilitado después de usarlo.

## 0.9.0 — 23 de octubre de 2026

- Portadas automáticas: se usan las imágenes que Steam y Xbox ya guardan en esta PC. La ficha muestra la imagen panorámica del juego cuando existe.
- Si un juego de Steam no tiene imagen local, se descarga una vez desde la CDN pública de Steam y queda guardada. Es la única conexión a internet de la aplicación y sólo envía el número del juego.
- La portada cargada a mano sigue teniendo prioridad.
- "Steamworks Common Redistributables" ya no aparece como juego.

## 0.8.1 — 23 de octubre de 2026

- El Explorador permite jugar desde cada fila: botón **Jugar**, doble clic o Enter. Las flechas recorren la tabla.
- Corregida la franja vacía sobre el encabezado al filtrar plataformas con pocos juegos.
- Lanzamientos validados manualmente en Steam, Epic, Xbox y Ubisoft.

## 0.8.0 — 23 de octubre de 2026

- Seguridad: los respaldos importados se validan igual que las ediciones de la ficha y la interfaz escapa los datos personales al mostrarlos.
- Los juegos se inician sin pasar por `cmd.exe`; un ejecutable inexistente muestra un error claro.
- Diagnóstico más útil: los juegos cuya carpeta ya no existe indican cómo resolverlo desde Steam o Epic.
- Pruebas automáticas de la API y del indexador (`npm test`) y código fuente formateado para facilitar su mantenimiento.

## 0.7.2 — 23 de octubre de 2026

- Seguridad: el servidor local sólo acepta conexiones desde esta PC y rechaza solicitudes de otros sitios web, que antes podían modificar rutas de lanzamiento e iniciar programas.

## 0.7.1 — 23 de octubre de 2026

- Fecha de última vez jugado disponible en ficha y Explorador para los inicios realizados desde Games Meta Launcher.
- Explorador simplificado como tabla única, con orden ascendente o descendente por cada columna.

## 0.7.0 — 23 de octubre de 2026

- Panel de diagnóstico con juegos detectados, disponibles y que requieren revisión por plataforma.
- Configuración visual de la indexación nocturna desde la aplicación.
- La tarea nocturna de la aplicación portable ejecuta la indexación sin abrir la ventana.

## 0.6.0 — 23 de octubre de 2026

- Nueva navegación de escritorio con Inicio, Biblioteca, Diagnóstico y Configuración.
- Pantalla de inicio con acceso rápido, resumen de la colección y favoritos.
- Filtros reorganizados, estados vacíos, notificaciones, accesos por teclado y ficha de juego refinada.

## 0.5.1 — 23 de octubre de 2026

- Corregida la primera apertura de la aplicación portable: ahora crea el inventario local antes de mostrar la biblioteca.

## 0.5.0 — 23 de octubre de 2026

- Aplicación de escritorio Electron y paquete portable para Windows.
- La aplicación guarda el inventario y las preferencias en su perfil local, fuera de la instalación.

## 0.4.0 — 23 de octubre de 2026

- Ficha editable con portada local, progreso, puntuación, notas y etiquetas.
- URI, ejecutable o AppsFolder personalizado para corregir un lanzamiento.
- Respaldo e importación de preferencias personales.

## 0.3.0 — 23 de octubre de 2026

- Detectores para Steam, Epic Games, Xbox/Microsoft Store, Ubisoft Connect, EA app y GOG Galaxy.
- Estado por juego: instalado o requiere revisión.
- Lanzamiento por URI, AppsFolder o ejecutable local cuando está disponible.
- Favoritos, etiquetas personales y últimos lanzamientos guardados sólo en esta PC.
- Filtros combinables por plataforma, estado, unidad, etiqueta y favoritos.
- Portadas retro generadas localmente y mejora de la interfaz adaptativa.
- Acceso directo de Escritorio y tarea de indexación nocturna.

## 0.1.0 — 23 de octubre de 2026

- Base del proyecto, inventario local y primera interfaz de biblioteca.
