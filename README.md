# Games Meta Launcher

Lanzador local para Windows que reúne juegos detectados en Steam, Epic Games, Xbox/Microsoft Store, Ubisoft Connect, EA app y GOG Galaxy en una sola biblioteca. El encabezado conserva un guiño retro; los controles priorizan una interfaz de escritorio clara.

## Estado

Versión `0.5.0`. Detecta instalaciones locales, permite filtrarlas, guardar preferencias y metadatos personales, y lanzar juegos mediante los identificadores locales que se puedan resolver. Incluye una aplicación portable de Windows para abrir la biblioteca sin navegador ni terminal. Las integraciones con bibliotecas compradas y cuentas externas quedan fuera de esta versión.

## Uso rápido

1. Abrí `release-v050/Games Meta Launcher 0.5.0.exe` cuando esté disponible, o ejecutá `npm run desktop` durante el desarrollo.
2. Elegí **Actualizar ahora** para reconstruir el inventario cuando lo necesites.
3. Usá **Ficha** en cada juego para cargar portada, etiquetas, estado, puntuación, notas o una ruta de lanzamiento personalizada.
4. Usá **Respaldar** y **Restaurar** para mover tus preferencias a otra instalación.

La versión portable incluye su propio runtime. Para desarrollo se requiere `npm install`.

## Desarrollo

| Comando | Acción |
| --- | --- |
| `npm start` | Inicia la interfaz local. |
| `npm run scan` | Reconstruye el inventario sin abrir la interfaz. |
| `npm run check` | Comprueba la sintaxis de los archivos de aplicación. |
| `npm run desktop` | Abre la aplicación en una ventana de escritorio. |
| `npm run package` | Genera el ejecutable portable de Windows en `release-v050/`. |

El inventario generado se guarda en `data/library.json`, que no forma parte del repositorio porque representa el estado de esta PC. Tus favoritos, etiquetas, progreso, notas, puntuaciones, portadas y últimos lanzamientos se guardan localmente en `data/preferences.json` y `data/covers/`, también excluidos del repositorio. La aplicación portable guarda esos datos en el perfil local de Windows.

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Operación e indexación nocturna](docs/operacion.md)
- [Plan de versiones](docs/roadmap.md)
- [Plan de trabajo](docs/plan-de-trabajo.md)
- [Registro de cambios](CHANGELOG.md)

## Versionado

Se usa versionado semántico: `MAYOR.MENOR.PARCHE`. Los cambios incompatibles incrementan MAYOR; las funciones nuevas compatibles, MENOR; las correcciones, PARCHE.
