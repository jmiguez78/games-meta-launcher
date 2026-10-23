# Plan de trabajo

Este plan organiza el proyecto por entregables verificables. No fija fechas rígidas: cada etapa termina cuando se cumplen sus criterios de aceptación.

```mermaid
flowchart LR
  A[Base local] --> B[Lanzamiento multitienda]
  B --> C[Calidad de biblioteca]
  C --> D[Aplicación de escritorio]
  D --> E[Experiencia de biblioteca]
  E --> F[Configuración y diagnóstico]
  F --> G[Integraciones de cuentas]
```

## Estado actual — implementación hasta 0.5.1 terminada

La base local está terminada:

- Repositorio Git inicializado y primer commit creado.
- Inventario local de Steam, Epic Games, Xbox/Microsoft Store y Ubisoft.
- Interfaz híbrida: cabecera retro y controles de aplicación de escritorio.
- Actualización manual y tarea diaria a las 03:00.
- Vistas Explorador, Detalle, Lista e Iconos grandes.
- Favoritos, etiquetas y últimos lanzamientos locales.
- Portadas locales, progreso, puntuación, notas y rutas de lanzamiento manuales.
- Respaldo e importación de preferencias personales.
- Aplicación de escritorio Electron y ejecutable portable de Windows.
- Primera apertura corregida: la aplicación crea su inventario local antes de mostrar la biblioteca.
- Rutas de lanzamiento implementadas para Steam, Epic, Ubisoft y Xbox/Microsoft Store cuando sus datos locales permiten resolverlas.

La implementación está completa, pero la validación real de cada launcher sigue pendiente. Se evitó abrir juegos durante las pruebas automáticas.

## Ahora — validación de las versiones 0.3 a 0.5

| Iniciativa | Resultado | Criterio de aceptación |
| --- | --- | --- |
| Validar lanzadores | Confirmar las rutas de inicio de Steam, Epic, Ubisoft y Xbox/Microsoft Store. | Se inicia al menos un juego de cada plataforma compatible desde la biblioteca. |
| Validar vistas y filtros | Comprobar los cuatro modos de presentación, búsquedas y filtros combinados. | No aparecen errores y el mismo conjunto de juegos se refleja en todas las vistas. |
| Validar la tarea nocturna | Confirmar que la tarea se ejecuta sin abrir ventanas ni alterar preferencias. | La fecha de escaneo cambia y favoritos/etiquetas permanecen intactos. |
| Ajustar detección | Resolver los juegos marcados como “Requiere revisión”. | Cada caso muestra una explicación correcta o queda excluido por decisión explícita. |
| Validar escritorio | Abrir la aplicación portable y confirmar que conserva los datos entre ejecuciones. | Se abre sin navegador ni terminal y los cambios personales persisten. |
| Validar personalización | Cargar una portada, editar la ficha y restaurar un respaldo. | Todos los datos se muestran tras reindexar o reiniciar. |

## Siguiente — versión 0.6: experiencia de biblioteca

| Iniciativa | Dependencia | Criterio de aceptación |
| --- | --- | --- |
| Fundaciones visuales | Definir paleta, tipografía, espaciado, iconos, estados y foco de teclado para una interfaz coherente. | Los controles comparten lenguaje visual, contraste legible y estados claros. |
| Navegación de biblioteca | Crear una pantalla de inicio útil y jerarquizar Biblioteca, filtros, vistas y acciones frecuentes. | El usuario puede entender dónde está y llegar a favoritos, recientes o toda la biblioteca en un paso. |
| Filtros y búsqueda | Reorganizar filtros en un panel claro, con filtros activos visibles, recuento y un restablecimiento inequívoco. | Buscar y combinar filtros no requiere leer instrucciones y el resultado se entiende de inmediato. |
| Vistas de juegos | Refinar tarjetas, lista, explorador y detalle con información escaneable, portadas y acciones consistentes. | Cada vista sirve a un propósito distinguible y conserva las acciones principales. |
| Ficha de juego | Convertir la edición en una ficha clara con agrupación, ayuda contextual y confirmaciones no intrusivas. | Editar metadatos, portada o lanzamiento no provoca dudas ni borra cambios por error. |
| Estados de aplicación | Diseñar carga, biblioteca vacía, error, éxito y datos incompletos. | No aparecen mensajes técnicos en pantalla; cada estado ofrece una siguiente acción comprensible. |
| Accesibilidad e interacción | Incorporar navegación por teclado, etiquetas, tamaños de objetivo y retroalimentación visual. | Las acciones frecuentes se pueden completar sin mouse y los controles tienen nombre visible o accesible. |

## Después — versión 0.7: configuración y diagnóstico

| Iniciativa | Dependencia | Criterio de aceptación |
| --- | --- | --- |
| Configuración de indexación | Gestionar desde la interfaz la hora y el estado de la tarea nocturna. | No hace falta editar scripts para los ajustes habituales. |
| Diagnóstico de launcher | Explicar rutas incompletas y ofrecer acciones de corrección. | Cada problema tiene una causa y una siguiente acción visible. |

## Más adelante — versión 1.0: bibliotecas compradas

Las integraciones con cuentas externas quedan deliberadamente fuera de las versiones iniciales. Se abordarán después de que el lanzamiento local sea confiable.

- Conectar cada plataforma mediante el método oficial que esté disponible.
- Mostrar “en biblioteca”, “instalado” y “no instalado” como estados independientes.
- Solicitar autorización explícita para cada cuenta y guardar sus credenciales de forma segura en el equipo.

## Prioridad y límites de alcance

La prioridad es: **detectar correctamente → lanzar correctamente → mejorar la biblioteca → conectar cuentas**. No se avanzará con APIs de cuentas antes de terminar los lanzadores locales.

Para mantener el ritmo, cada ciclo reservará aproximadamente 70% para funciones visibles, 20% para estabilidad y 10% para correcciones o mejoras pequeñas.

## Revisión del plan

Revisar este documento después de completar cada versión menor. Si aparece una nueva idea, se agrega al final como candidata y sólo sube de prioridad si reemplaza una tarea ya planificada.
