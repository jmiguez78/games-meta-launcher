# Games Meta Launcher

Lanzador local para Windows que reúne juegos detectados en Steam, Epic Games, Xbox/Microsoft Store, Ubisoft Connect, EA app y GOG Galaxy en una sola biblioteca de estética retro.

## Estado

Versión `0.3.0`. Detecta instalaciones locales, permite filtrarlas, guardar favoritos y etiquetas, y lanzar juegos mediante los identificadores locales que se puedan resolver. Las integraciones con bibliotecas compradas y cuentas externas quedan fuera de esta versión.

## Uso rápido

1. Abrí PowerShell en esta carpeta.
2. Ejecutá `npm start`.
3. Abrí `http://localhost:4321` en el navegador.
4. Elegí **Actualizar ahora** para reconstruir el inventario cuando lo necesites.

No requiere instalar dependencias de npm para esta primera versión.

## Desarrollo

| Comando | Acción |
| --- | --- |
| `npm start` | Inicia la interfaz local. |
| `npm run scan` | Reconstruye el inventario sin abrir la interfaz. |
| `npm run check` | Comprueba la sintaxis de los archivos de aplicación. |

El inventario generado se guarda en `data/library.json`, que no forma parte del repositorio porque representa el estado de esta PC.
Tus favoritos, etiquetas y últimos lanzamientos se guardan localmente en `data/preferences.json`, también excluido del repositorio.

## Documentación

- [Arquitectura](docs/arquitectura.md)
- [Operación e indexación nocturna](docs/operacion.md)
- [Plan de versiones](docs/roadmap.md)
- [Plan de trabajo](docs/plan-de-trabajo.md)
- [Registro de cambios](CHANGELOG.md)

## Versionado

Se usa versionado semántico: `MAYOR.MENOR.PARCHE`. Los cambios incompatibles incrementan MAYOR; las funciones nuevas compatibles, MENOR; las correcciones, PARCHE.
