# Plan de trabajo

Este plan organiza el proyecto por entregables verificables. No fija fechas rígidas: cada etapa termina cuando se cumplen sus criterios de aceptación.

```mermaid
flowchart LR
  A[Base local] --> B[Lanzamiento multitienda]
  B --> C[Calidad de biblioteca]
  C --> D[Aplicación de escritorio]
  D --> E[Integraciones de cuentas]
```

## Estado actual — implementación hasta 0.3 terminada

La base local está terminada:

- Repositorio Git inicializado y primer commit creado.
- Inventario local de Steam, Epic Games, Xbox/Microsoft Store y Ubisoft.
- Interfaz híbrida: cabecera retro y controles de aplicación de escritorio.
- Actualización manual y tarea diaria a las 03:00.
- Vistas Explorador, Detalle, Lista e Iconos grandes.
- Favoritos, etiquetas y últimos lanzamientos locales.
- Rutas de lanzamiento implementadas para Steam, Epic, Ubisoft y Xbox/Microsoft Store cuando sus datos locales permiten resolverlas.

La implementación está completa, pero la validación real de cada launcher sigue pendiente. Se evitó abrir juegos durante las pruebas automáticas.

## Ahora — validación de la versión 0.3

| Iniciativa | Resultado | Criterio de aceptación |
| --- | --- | --- |
| Validar lanzadores | Confirmar las rutas de inicio de Steam, Epic, Ubisoft y Xbox/Microsoft Store. | Se inicia al menos un juego de cada plataforma compatible desde la biblioteca. |
| Validar vistas y filtros | Comprobar los cuatro modos de presentación, búsquedas y filtros combinados. | No aparecen errores y el mismo conjunto de juegos se refleja en todas las vistas. |
| Validar la tarea nocturna | Confirmar que la tarea se ejecuta sin abrir ventanas ni alterar preferencias. | La fecha de escaneo cambia y favoritos/etiquetas permanecen intactos. |
| Ajustar detección | Resolver los juegos marcados como “Requiere revisión”. | Cada caso muestra una explicación correcta o queda excluido por decisión explícita. |

## Siguiente — versión 0.4: calidad y personalización

| Iniciativa | Dependencia | Criterio de aceptación |
| --- | --- | --- |
| Portadas reales opcionales | Incorporar carátulas desde archivos locales o una fuente que autorices. | Se puede elegir entre portada real y portada generada. |
| Metadatos editables | Añadir género, estado de avance, puntuación y notas personales. | Los datos persisten tras reindexar. |
| Lanzamiento configurable | Permitir corregir manualmente una ruta o URI de lanzamiento. | Un juego no detectado automáticamente puede iniciarse tras configurar su ruta. |
| Importar/exportar preferencias | Respaldar favoritos y etiquetas. | Un archivo de respaldo restaura una biblioteca personal. |

## Después — versión 0.5: empaquetado de escritorio

| Iniciativa | Valor | Criterio de aceptación |
| --- | --- | --- |
| Ejecutable de Windows | Empaquetar el lanzador para no depender de Node ni del navegador. | Se abre desde el Escritorio como aplicación nativa. |
| Configuración en pantalla | Gestionar hora de indexación, rutas y preferencias desde la interfaz. | No hace falta editar scripts o archivos para los ajustes comunes. |
| Diagnóstico de instalación | Mostrar un panel de salud para rutas y launchers. | Los problemas se explican y proponen una acción de resolución. |

## Más adelante — versión 1.0: bibliotecas compradas

Las integraciones con cuentas externas quedan deliberadamente fuera de las versiones iniciales. Se abordarán después de que el lanzamiento local sea confiable.

- Conectar cada plataforma mediante el método oficial que esté disponible.
- Mostrar “en biblioteca”, “instalado” y “no instalado” como estados independientes.
- Solicitar autorización explícita para cada cuenta y guardar sus credenciales de forma segura en el equipo.

## Prioridad y límites de alcance

La prioridad es: **detectar correctamente → lanzar correctamente → mejorar la biblioteca → conectar cuentas**. No se avanzará con APIs de cuentas antes de terminar los lanzadores locales.

Para mantener el ritmo, cada ciclo reservará aproximadamente 70% para funciones visibles, 20% para estabilidad y 10% para correcciones o mejoras pequeñas.

## Revisión del plan

Revisar este documento después de completar cada versión menor (`0.1`, `0.2`, `0.3`). Si aparece una nueva idea, se agrega al final como candidata y sólo sube de prioridad si reemplaza una tarea ya planificada.
