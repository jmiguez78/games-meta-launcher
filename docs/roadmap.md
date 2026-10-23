# Plan de versiones

## 0.1.0 — Base local · Completada

- Indexador local de instalaciones.
- Interfaz retro con búsqueda, filtros y orden.
- Lanzamiento por URI para Steam.
- Actualización manual y preparación para tarea nocturna.

## 0.2.0 — Lanzadores locales · Completada

- Lanzamiento mediante URI o ejecutable local cuando el identificador se puede resolver.
- Estado de disponibilidad por launcher y diagnóstico de rutas incompletas.

## 0.3.0 — Biblioteca personal · Completada

- Portadas retro generadas localmente, favoritos y etiquetas personales.
- Últimos lanzamientos y filtros combinables.
- Las integraciones de cuentas quedan programadas para una versión posterior.

## 0.4.0 — Personalización · Completada

- Portadas opcionales desde archivos PNG, JPG o WebP locales.
- Estado, puntuación, notas y etiquetas por juego.
- Ruta o URI de lanzamiento personalizada.
- Respaldo e importación de la biblioteca personal.

## 0.5.0 — Aplicación de escritorio · Completada

- Ventana nativa de Windows sin navegador ni terminal.
- Ejecutable portable para distribución local.
- Datos de biblioteca aislados en el perfil local de la aplicación.

## 0.6.0 — Experiencia de biblioteca · Completada

- Sistema visual coherente: controles, estados, iconos, tipografía y accesibilidad.
- Navegación y pantalla de inicio enfocadas en jugar, favoritos y actividad reciente.
- Filtros, vistas y ficha de juego más claras y rápidas de usar.
- Estados de carga, vacío, error y éxito orientados a acciones concretas.

## 0.7.0 — Configuración y diagnóstico · Completada

- Configuración en pantalla de la indexación nocturna.
- Panel de salud por plataforma, launchers y detecciones incompletas.
- La tarea programada invoca la indexación sin abrir la ventana de la aplicación.

## 0.7.1 — Exploración de biblioteca · Completada

- Fecha de última vez jugado para inicios realizados desde Games Meta Launcher.
- Vista Explorador en tabla única y ordenamiento ascendente o descendente desde cada encabezado.

## 0.7.2 — Seguridad del servidor local · Completada

- Servidor accesible sólo desde `127.0.0.1` y protegido contra solicitudes de otros orígenes.

## 0.8.0 — Refinamiento y validación · Completada

- Validación de respaldos importados y escape de datos personales en la interfaz.
- Lanzamiento sin `cmd.exe` y errores claros cuando falta un ejecutable.
- Diagnóstico con acciones concretas para juegos cuya carpeta ya no existe.
- Pruebas automáticas y código fuente formateado.

## 0.8.1 — Validación y Explorador · Completada

- Lanzamientos validados manualmente por plataforma.
- Juego directo desde el Explorador y corrección del encabezado con pocos resultados.

## 0.9.0 — Portadas automáticas · Completada

- Imágenes locales de Steam (portada, encabezado y panorámica) y logos de Xbox.
- Descarga desde la CDN pública de Steam cuando falta la imagen local, con caché.

## 0.10.0 — Metadatos enriquecidos (en evaluación)

- Descripción, géneros, fecha de lanzamiento, desarrolladora y puntuaciones desde una base de datos de videojuegos.
- Portadas para Epic, Ubisoft y otras plataformas sin imágenes locales.
