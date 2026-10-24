# Registro de cambios

## 0.21.0 — 24 de octubre de 2026

Segunda ronda, etapa C: el momento de jugar.

- Al apretar Jugar aparece de inmediato una pantalla con el arte y el logo del juego y «Iniciando en Steam…» (o la tienda que corresponda). Cuando la tienda confirma, pasa a «Listo. Que lo disfrutes.» y se cierra sola. También se cierra con un clic o Escape.
- La ventana se minimiza al iniciar un juego para que quede adelante. Se puede desactivar en Configuración → General → «Al iniciar un juego».
- El aviso «inicio solicitado» se reemplaza por esa pantalla.

## 0.20.0 — 24 de octubre de 2026

Segunda ronda, etapa B: Configuración ordenada.

- Configuración pasa de un mosaico de tarjetas a tres secciones (General, Cuentas e información y Mantenimiento), con la explicación a la izquierda y los controles a la derecha.
- Con Steam o IGDB conectados se ve el estado en una línea («Conectada: 279 juegos, sincronizada hace 3 h») y las acciones. Los campos de credenciales quedan ocultos hasta elegir «Cambiar de cuenta».
- El tema oscuro aparece primero entre las opciones de apariencia.
- Los campos de texto tienen bordes con contraste suficiente en el tema claro.

## 0.19.0 — 24 de octubre de 2026

Segunda ronda, etapa A: una Biblioteca para encontrar cualquier juego en segundos.

- Dos vistas: Portadas y Tabla. Lista y Ficha se retiran, porque la página de cada juego cumple su función. La vista elegida se recuerda.
- El orden está a la vista junto a la búsqueda: nombre, jugados recientemente, más horas, mejor valorados, más cortos primero y tienda.
- Panel de filtros lateral con conteos: tienda, género, duración, tiempo jugado (incluye «Nunca jugado»), valoración y etiquetas, más «Sólo favoritos». Las opciones de un mismo grupo se suman y los grupos se combinan. El panel recuerda si quedó abierto.
- Tabla nueva: portada, nombre, tienda, estado, horas jugadas, última sesión (desde la aplicación o Steam), valoración y duración. Todas las columnas se ordenan, y Jugar e Instalar son botones de ícono.
- Un juego comprado en varias tiendas aparece una vez, con la copia jugable adelante. La portada indica en cuántas tiendas está, y la página del juego suma «También en» para abrir las otras copias.
- La búsqueda ignora tildes, combina palabras y reutiliza las portadas ya armadas: responde unas tres veces más rápido. Las portadas fuera de pantalla no se pintan hasta acercarse.
- Inicio tampoco repite juegos entre tiendas.
- La lógica de búsqueda, filtros, orden y duplicados vive en `public/catalog.js` y tiene pruebas automáticas.

## 0.18.0 — 24 de octubre de 2026

Fase 3 del plan de experiencia: una página propia para cada juego.

- Un clic en una portada, en una fila de Lista o Tabla, en «Ver ficha» de Inicio o Mayús+Enter en la paleta abre la página del juego. La portada se expande hasta convertirse en la cabecera.
- Cabecera de borde a borde con el arte panorámico y el logo del juego (desde la caché de Steam o su CDN), y los datos principales: plataforma, año, géneros y desarrolladora.
- Columna fija con Jugar o Instalar, Favorito y Editar, tiempo jugado, últimas dos semanas, última sesión, duración estimada, valoración, tu progreso y un anillo con el avance de logros de Steam.
- La descripción se muestra en español desde la tienda de Steam cuando existe; si no, la de IGDB, con una nota de que está en inglés.
- Pestañas subrayadas; las capturas se recorren en una tira horizontal.
- Los datos técnicos (unidad, ubicación, forma de inicio y detección) pasan a la sección «Instalación».
- Las pestañas Steam y Logros muestran un esqueleto mientras cargan.
- Volver o Escape regresan al lugar de origen y devuelven el foco al juego.
- En las portadas, Enter juega y Espacio abre la página. La vista Ficha de la Biblioteca suma «Abrir ficha completa».

## 0.17.0 — 24 de octubre de 2026

Fase 2 del plan de experiencia: un Inicio que propone qué jugar.

- Imagen principal a todo el ancho con el último juego que jugaste (en Steam o desde la aplicación), su logo, horas jugadas, última sesión y los botones Jugar, Ver ficha y Favorito. Las miniaturas de la derecha cambian entre cinco juegos destacados.
- Filas por intención con desplazamiento horizontal: Continuar, Favoritos, Instalados sin estrenar, Para una sesión corta, Lo mejor valorado de tu colección y Para instalar. Las filas vacías no aparecen, salvo Favoritos, que explica cómo marcar juegos.
- Con el teclado, las flechas izquierda y derecha recorren una fila; arriba y abajo pasan a la fila vecina.
- Las métricas con contadores salen de Inicio. El estado de la biblioteca pasa a Configuración, y la sección de revisión aparece en la barra lateral sólo cuando hay juegos que necesitan atención, con su cantidad.
- «Actualizar» y la hora de la última indexación se reemplazan por «Buscar juegos nuevos» y «Biblioteca actualizada hace 3 h» al pie de la barra lateral.
- La selección de juegos para Inicio vive en `public/shelves.js` y tiene pruebas automáticas.

## 0.16.0 — 24 de octubre de 2026

Fase 1 del plan de experiencia: identidad visual.

- Tema oscuro como base, con una paleta de tinta violeta que deja el color al arte de cada juego. El tema claro se rediseñó con los mismos tokens.
- El fondo toma el color del juego que estás mirando: al pasar el mouse o moverte con el teclado, el brillo ambiental cambia suavemente.
- Tipografías incluidas en la aplicación: Bricolage Grotesque para títulos e Inter para la interfaz. Ya no dependen de lo que tenga instalado Windows.
- Portadas sin marco: la imagen es la tarjeta. Al pasar el mouse se elevan con un brillo del color del juego y muestran Jugar.
- Jugar usa un coral propio en toda la aplicación; los demás botones principales usan tinta invertida.
- Barra lateral angosta con íconos, que se expande al pasar el mouse o al llegar con el teclado. Marca e ícono nuevos.
- Títulos en oración y sin rótulos en mayúsculas; transición breve al cambiar de página. Todo el movimiento se desactiva si Windows pide reducirlo.

## 0.15.0 — 24 de octubre de 2026

Fase 0 del plan de experiencia: correcciones visibles.

- La Biblioteca abre con los juegos instalados. Un selector junto a la búsqueda cambia a toda la cuenta de Steam y muestra cuántos juegos hay en cada caso.
- «No instalado» se muestra en gris con un aro, en lugar del verde de «Listo». «Requiere revisión» sigue en ámbar.
- La lista de la vista Ficha muestra la portada de cada juego; antes quedaban las iniciales. La paleta de comandos también muestra portadas.
- Nombres limpios: se quitan sufijos de tienda como «- Windows» o «PC Edition» y las marcas ® y ™. El nombre original sigue sirviendo para buscar.
- La barra lateral queda fija al desplazar el contenido.
- La ventana se abre recién cuando la interfaz está lista, sin destello blanco, y con un ícono propio.
- El tema oscuro pasa a ser el predeterminado cuando no hay una elección guardada.
- La prueba de logos de Xbox funciona en cualquier sistema operativo.

## 0.14.2 — 23 de octubre de 2026

- Inicio rediseñado como un resumen breve y visual de la colección, con indicadores de juegos disponibles, favoritos y partidas en curso.
- Las vistas de Biblioteca ahora tienen una intención explícita: Portadas para descubrir, Lista para escanear, Ficha para profundizar y Tabla para comparar.
- Un clic o Enter sobre un juego en Lista o Tabla abre su Ficha. Las acciones de jugar, instalar, favorito y editar conservan su comportamiento directo.

## 0.14.1 — 23 de octubre de 2026

- Retirada la sección Steam del menú y su panel independiente de actividad, deseados, seguidos, recomendaciones y amigos. La navegación vuelve a Inicio, Biblioteca, Diagnóstico y Configuración.
- Sincronización de la biblioteca de Steam trasladada a Configuración, junto a la conexión de cuenta.
- Se conservan la biblioteca fusionada, los filtros de instalación, las cuatro vistas y los datos de actividad, logros, compatibilidad y tienda en las fichas.


## 0.14.0 — 23 de octubre de 2026

- Steam autónomo en el portable: MCP incluido, credenciales DPAPI, conexión manual o importación local y sincronización en segundo plano.
- Biblioteca de cuenta fusionada por App ID con instalaciones locales: filtros de instalación y acción para instalar mediante Steam.
- Horas totales y recientes, última actividad de Steam y colecciones por tiempo registrado.
- Logros completos con progreso, pendientes, fechas y rareza global; privacidad explícita y progreso personal independiente.
- Tienda, requisitos, idiomas, mando, compatibilidad, reseñas agregadas, evolución y noticias. Reseñas individuales cuando Steam las permite.
- Deseados con moneda verificada, descuentos, seguidos y recomendaciones; amigos, comparación de bibliotecas y amigos que poseen cada juego. Listas parciales identificadas.
- Caché por cuenta, conservación ante fallas de red, validación de biblioteca completa y carga diferida de portadas.

## 0.13.0 — 23 de octubre de 2026

- Ficha reorganizada en **Resumen**, **Información** y **Multimedia**, con navegación por flechas, Inicio y Fin. La pestaña elegida se conserva al cambiar de juego.
- Más espacio para la ficha en la vista Detalle y desplazamiento independiente de la lista y el panel en escritorio; en pantallas pequeñas vuelven a apilarse.
- Galería integrada para ampliar capturas e ilustraciones, recorrerlas con botones o flechas y cerrar con Escape, devolviendo el foco a la miniatura. Incluye estados de carga, error y reintento.
- Las fichas sin metadatos muestran mensajes claros. Los videos y enlaces siguen abriéndose externamente.
- Corregida la ubicación de las etiquetas personales y un cruce de selectores que podía sobrescribir datos de IGDB con detalles técnicos locales.
- Contexto visual registrado en `.21st/`; referencia pública de pestañas de 21st adaptada al HTML/CSS del proyecto. Revisión local de 21st sin errores ni advertencias.

## 0.12.0 — 23 de octubre de 2026

- Fichas de IGDB ampliadas: descripción completa, historia (plegada por posibles spoilers), temáticas, palabras clave, modos, perspectivas, plataformas, motores, colecciones, franquicias y nombres alternativos.
- Compañías con sus roles, idiomas separados por audio/subtítulos/interfaz, multijugador por plataforma, clasificaciones de edad y fechas por plataforma/región.
- Valoraciones de crítica y comunidad con cantidad de votos y duración estimada de IGDB cuando existe, con su cantidad de muestras.
- Galería de capturas e ilustraciones, videos, sitios web, DLC, expansiones, ediciones y juegos relacionados.
- Información organizada en secciones desplegables; se conservan las fichas anteriores hasta actualizar. La caché guarda la respuesta original de IGDB para futuras mejoras y la fecha de descarga.
- Autenticación real y descarga ampliada verificadas con los 50 juegos de la biblioteca local. El emparejamiento sigue en beta hasta revisar manualmente cada coincidencia.
- Las actualizaciones reutilizan los ID de IGDB conocidos (con prioridad al App ID exacto de Steam) y conservan la caché anterior si falla la consulta. Las credenciales de Twitch viajan en el cuerpo de la solicitud.

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
