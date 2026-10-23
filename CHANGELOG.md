# Registro de cambios

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
