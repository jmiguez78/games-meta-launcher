# Games Meta Launcher

Lanzador local para Windows que reúne juegos detectados en Steam, Epic Games, Xbox/Microsoft Store, Ubisoft Connect, EA app y GOG Galaxy en una sola biblioteca. El encabezado conserva un guiño retro; los controles priorizan una interfaz de escritorio clara.

## Estado

Versión `0.14.2`. Detecta instalaciones locales, muestra sus portadas, permite filtrarlas, guardar preferencias y metadatos personales, y lanzar juegos mediante los identificadores locales que se puedan resolver. Incluye una aplicación portable de Windows con modo claro y oscuro, un panel de diagnóstico, la configuración visual de la indexación nocturna, una paleta de comandos (Control+K), avisos con Deshacer y fichas ampliadas desde IGDB: historia, idiomas, modos, compañías, valoraciones, duración estimada, clasificaciones, lanzamientos, capturas, videos y juegos relacionados. El emparejamiento de IGDB sigue en beta. Steam enriquece la biblioteca con juegos de cuenta, instalados o no, actividad, logros y datos de la tienda.

## Uso rápido

1. Abrí `release-v0142-final/Games Meta Launcher 0.14.2.exe` cuando esté disponible, o ejecutá `npm run desktop` durante el desarrollo.
2. En **Inicio**, elegí favoritos o juegos listos para iniciar.
3. En **Biblioteca**, buscá, filtrá y elegí la vista que mejor se adapte a la tarea. El modo **Explorador** reúne toda la colección en una única tabla: seleccioná cualquier encabezado para ordenar ascendente o descendentemente.
4. En **Diagnóstico**, revisá las plataformas y juegos que requieren atención.
5. En **Configuración**, elegí la hora de la indexación nocturna y respaldá tus preferencias.

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
| `npm run package` | Genera el ejecutable portable de Windows en `release-v0142-final/`. |

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

Se usa versionado semántico: `MAYOR.MENOR.PARCHE`. Los cambios incompatibles incrementan MAYOR; las funciones nuevas compatibles, MENOR; las correcciones, PARCHE.
