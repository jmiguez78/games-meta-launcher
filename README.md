# Games Meta Launcher

Lanzador local para Windows que reúne juegos detectados en Steam, Epic Games, Xbox/Microsoft Store, Ubisoft Connect, EA app y GOG Galaxy en una sola biblioteca. El encabezado conserva un guiño retro; los controles priorizan una interfaz de escritorio clara.

## Estado

Versión `0.18.0`. Detecta instalaciones locales y las reúne con tu cuenta de Steam. Inicio propone qué jugar con una imagen principal y filas por intención (Continuar, Favoritos, sin estrenar, sesiones cortas, mejor valorados y para instalar). Cada juego tiene su propia página con arte, logo, descripción en español cuando Steam la ofrece, tiempo jugado y logros. La interfaz usa el tema oscuro por defecto, toma el color del juego en foco y tiene paleta de comandos (Control+K), avisos con Deshacer y navegación completa por teclado. La información ampliada de IGDB sigue en beta.

## Uso rápido

1. Generá el portable con `npm run package` y abrí `releases/Games Meta Launcher 0.18.0.exe`, o ejecutá `npm run desktop` durante el desarrollo.
2. En **Inicio**, elegí el juego destacado o uno de las filas. Un clic en cualquier portada abre la página del juego; el botón Jugar lo inicia.
3. En **Biblioteca**, buscá y filtrá. Por defecto se muestran los juegos instalados; «Toda la cuenta» suma los de Steam sin instalar.
4. En **Configuración**, revisá el estado de la biblioteca, conectá Steam e IGDB, elegí el tema y la hora de la indexación nocturna, y respaldá tus preferencias. Si algún juego necesita revisión, la barra lateral lo indica.

La versión portable incluye su propio runtime. Para desarrollo se requiere `npm install`.

## Desarrollo

| Comando | Acción |
| --- | --- |
| `npm start` | Inicia la interfaz local. |
| `npm run scan` | Reconstruye el inventario sin abrir la interfaz. |
| `npm run check` | Comprueba la sintaxis de los archivos de aplicación. |
| `npm test` | Ejecuta las pruebas automáticas de la API y el indexador. |
| `npm run format` | Formatea el código con Prettier. |
| `npm run desktop` | Abre la aplicación en una ventana de escritorio. |
| `npm run package` | Genera el portable de Windows y lo guarda en `releases/`. Conserva sólo la versión actual y la anterior. |

El inventario generado se guarda en `data/library.json`, que no forma parte del repositorio porque representa el estado de esta PC. Tus favoritos, etiquetas, progreso, notas, puntuaciones, portadas y fecha de última vez jugado se guardan localmente en `data/preferences.json` y `data/covers/`, también excluidos del repositorio. La fecha de juego se registra al iniciar un título desde Games Meta Launcher. La aplicación portable guarda esos datos en el perfil local de Windows.

## Información ampliada de IGDB

En **Configuración → Información de juegos**, conectá IGDB y elegí **Actualizar información**. Para consultar los datos, abrí **Biblioteca → Detalle** y seleccioná un juego. La ficha organiza el contenido en **Resumen**, **Información** y **Multimedia**. Las imágenes se amplían dentro de la aplicación y se recorren con las flechas; Escape cierra el visor. Las secciones sólo aparecen cuando IGDB dispone de información; la historia queda plegada por posibles spoilers. Los textos se conservan en la caché local, mientras que las imágenes de la galería pueden requerir internet.

## Conexión con Steam

En **Configuración → Steam**, ingresá tu SteamID64 y clave de Steam Web API, o usá la conexión guardada en esta PC. Las credenciales se cifran con Windows DPAPI para tu usuario. El portable incluye `steam-games-mcp` 0.17.0 y su runtime; funciona sin Codex ni Node instalados.

La biblioteca cruza cuenta e instalaciones por App ID. Filtrá **Instalados / No instalados**; **Instalar en Steam** abre el cliente para administrar la descarga. Steam funciona como fuente de datos de la biblioteca, sin una sección propia en el menú. La sincronización está en Configuración. Las fichas agregan **Steam** y **Logros**, con requisitos, idiomas, mando, compatibilidad, reseñas agregadas, novedades y rareza global. Las reseñas individuales pueden no estar disponibles en Steam.

Las cuatro vistas de Biblioteca tienen roles distintos: **Portadas** para explorar, **Lista** para escanear rápidamente y abrir una ficha al elegir un juego, **Ficha** para comparar juegos y ver el detalle sin salir de la colección, y **Tabla** para ordenar y contrastar los datos esenciales.

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
