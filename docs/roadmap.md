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

## 0.10.0 — Interfaz 2.0, modo oscuro y metadatos · Completada

- Sistema visual 2.0 en todas las pantallas, navegación completa por teclado y criterios WCAG 2.2 AA.
- Modo oscuro que sigue a Windows o se elige en Configuración.
- Integración opcional con IGDB (beta): descripción, géneros, año, desarrolladora, valoración y portadas faltantes.

## 0.11.0 — Avisos, formularios y paleta de comandos · Completada

- Paleta de comandos con Control+K para abrir juegos, ir a secciones y ejecutar acciones.
- Avisos apilados con Deshacer, Reintentar y progreso de las operaciones largas.
- Errores de formulario junto al campo que los causa en la ficha y en Configuración.

## 0.12.0 — Metadatos ampliados · Completada

- Fichas ampliadas con historia, idiomas, clasificaciones, compañías, modos, plataformas, lanzamientos, duración estimada y valoraciones desglosadas.
- Capturas, ilustraciones, videos, sitios web, ediciones y juegos relacionados.
- Descarga real verificada para 50 juegos, caché local y compatibilidad con fichas anteriores.

## 0.13.0 — Fichas y multimedia · Completada

- Pestañas Resumen, Información y Multimedia con navegación por teclado.
- Galería ampliable integrada y desplazamiento independiente de lista/ficha.
- Contexto visual del proyecto y revisión local de 21st.

## Próximo — Validación de coincidencias de IGDB

- Revisar manualmente la coincidencia de cada juego; la autenticación y las consultas reales ya están verificadas.
- Quitar la etiqueta beta cuando los juegos de todas las plataformas se emparejen correctamente.

## 0.14.0 — Integración Steam · Completada

Biblioteca de cuenta, instalación, actividad, logros, tienda, deseados, seguidos, recomendaciones y consultas sociales. Las fases del [plan de Steam](plan-integracion-steam.md) se consolidaron en esta entrega.

## 0.14.1 — Integraciones al servicio de la biblioteca · Completada

Retirado el destino Steam de la navegación y su panel independiente. Se conserva el enriquecimiento de la colección y se ubica la sincronización en Configuración. Las nuevas integraciones deberán seguir el mismo criterio.

## 0.14.2 — Claridad de Inicio y Biblioteca · Completada

Inicio pasa a resumir la colección sin una presentación genérica. Portadas, Lista, Ficha y Tabla tienen roles y transiciones definidos para descubrir, escanear, profundizar y comparar.

## 0.15.0 — Correcciones visibles · Completada

Fase 0 del plan de experiencia: instalados primero, estados con su color, portadas en todas las vistas, nombres limpios, barra lateral fija y ventana sin destello.

## 0.16.0 — Identidad visual · Completada

Fase 1: tema oscuro como base, color ambiental tomado del arte, tipografías incluidas, portadas sin marco, barra lateral angosta y marca nueva.

## 0.17.0 — Inicio que propone qué jugar · Completada

Fase 2: imagen principal con el último juego jugado y filas por intención. El estado de la biblioteca pasa a Configuración y la revisión aparece sólo cuando hace falta.

## 0.18.0 — Página de cada juego · Completada

Fase 3: página propia con arte de borde a borde, logo, descripción en español, columna de acción con tiempo jugado y logros, y transición desde la portada.

## 0.19.0 — Biblioteca potente · Completada

Dos vistas, orden visible, filtros por facetas con conteos, tabla con horas, última sesión, valoración y duración, juegos de varias tiendas agrupados y búsqueda unas tres veces más rápida.

## 0.20.0 — Configuración ordenada · Completada

Tres secciones con explicación y controles lado a lado; Steam e IGDB muestran su estado y ocultan las credenciales.

## 0.21.0 — El momento de jugar · Completada

Pantalla «Iniciando…» con el arte del juego y ventana que se minimiza al jugar (opcional).

## 0.22.0 — Mando y pantalla grande · Completada

Navegación completa con mando y modo de pantalla grande con F11, Menú o desde Configuración.

## Próximo

- Registro de sesiones con duración: requiere vigilar el proceso de cada juego en Windows y validarlo en la PC.
- Validación de coincidencias de IGDB, pendiente desde 0.12.0.
- Grilla virtualizada si la colección supera los 1.000 juegos.
