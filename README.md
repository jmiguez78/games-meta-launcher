# Games Meta Launcher

Lanzador local para Windows que reúne juegos detectados en Steam, Epic Games, Xbox/Microsoft Store, Ubisoft Connect, EA app y GOG Galaxy en una sola biblioteca. El encabezado conserva un guiño retro; los controles priorizan una interfaz de escritorio clara.

## Estado

Versión `0.9.0`. Detecta instalaciones locales, permite filtrarlas, guardar preferencias y metadatos personales, y lanzar juegos mediante los identificadores locales que se puedan resolver. Incluye una aplicación portable de Windows, un panel de diagnóstico y la configuración visual de la indexación nocturna. Las integraciones con bibliotecas compradas y cuentas externas quedan fuera de esta versión.

## Uso rápido

1. Abrí `release-v090/Games Meta Launcher 0.9.0.exe` cuando esté disponible, o ejecutá `npm run desktop` durante el desarrollo.
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
| `npm run package` | Genera el ejecutable portable de Windows en `release-v090/`. |

El inventario generado se guarda en `data/library.json`, que no forma parte del repositorio porque representa el estado de esta PC. Tus favoritos, etiquetas, progreso, notas, puntuaciones, portadas y fecha de última vez jugado se guardan localmente en `data/preferences.json` y `data/covers/`, también excluidos del repositorio. La fecha de juego se registra al iniciar un título desde Games Meta Launcher. La aplicación portable guarda esos datos en el perfil local de Windows.

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Operación e indexación nocturna](docs/operacion.md)
- [Plan de versiones](docs/roadmap.md)
- [Plan de trabajo](docs/plan-de-trabajo.md)
- [Sistema de diseño](docs/sistema-de-diseno.md)
- [Registro de cambios](CHANGELOG.md)

## Versionado

Se usa versionado semántico: `MAYOR.MENOR.PARCHE`. Los cambios incompatibles incrementan MAYOR; las funciones nuevas compatibles, MENOR; las correcciones, PARCHE.
