# Registro de cambios

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
