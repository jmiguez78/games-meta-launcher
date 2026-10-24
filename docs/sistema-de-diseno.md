# Sistema de diseño

Identidad 3.0, «sala de proyección» (desde 0.16.0). La interfaz es tinta oscura y deja que el color lo ponga el juego que se está mirando.

## Principios

1. **El arte es la interfaz.** Portadas, imágenes panorámicas y logos definen el color y la jerarquía. La interfaz se retira: pocos bordes, pocas tarjetas y poco texto de ayuda.
2. **Un gesto para jugar.** Desde Inicio, una portada, la página del juego o la paleta, jugar lleva un clic o una tecla.
3. **Contexto, no inventario.** Inicio responde «¿a qué juego?»; la Biblioteca responde «¿qué tengo?».
4. **Que se sienta vivo.** Cada acción responde de inmediato con un movimiento que explica qué pasó. Todo el movimiento se apaga con «reducir movimiento».
5. **Mantenimiento invisible.** Buscar juegos, sincronizar y revisar pasan en segundo plano; la revisión aparece sólo cuando hay algo que resolver.
6. **Un idioma, un nombre.** Todo en español, sin sufijos técnicos de las tiendas.

## Archivos

- `public/style.css`: tokens de color de ambos temas, estructura base y componentes heredados.
- `public/ui.css`: escala de espaciado, controles, foco, estados y componentes de cada pantalla.
- `public/experience.css`: identidad 3.0. Tipografías, barra lateral, color ambiental, portadas, imagen principal de Inicio, filas, página de juego y pestañas. Se carga al final.
- `public/shelves.js`: reglas que eligen los juegos de Inicio. Son funciones puras y tienen pruebas (`test/shelves.test.mjs`).
- `public/fonts/`: Bricolage Grotesque e Inter, con sus licencias OFL.
- `public/brand/`: marca en SVG y PNG. `build/icon.ico` es el ícono del ejecutable.
- Los íconos son SVG de trazo (estilo Lucide, licencia ISC) definidos en `public/js/icons.js` (`iconPaths`). En el HTML se insertan con `data-icon="nombre"`.

## Color

El tema oscuro es la base. El tema claro redefine los mismos tokens, y «Sistema» sigue a Windows.

| Token                                               | Oscuro                            | Claro                             | Uso                                                                 |
| --------------------------------------------------- | --------------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| `--bg`                                              | `#0e0d15`                         | `#f4f2f8`                         | Fondo de la aplicación.                                             |
| `--surface` / `--surface-soft` / `--surface-raised` | `#17151f` / `#1e1b29` / `#24212f` | `#fff` / `#f7f5fb` / `#fff`       | Superficies por elevación.                                          |
| `--ink` / `--ink-soft` / `--muted`                  | `#f2eff8` / `#cbc5d8` / `#9890ab` | `#18151f` / `#4a4558` / `#6a6479` | Texto principal, secundario y de apoyo (≥ 4,5:1).                   |
| `--accent` / `--accent-text`                        | `#8e7dff` / `#b9aeff`             | `#5b47e0` / `#4b38c9`             | Violeta de marca: selección y enlaces.                              |
| `--play` / `--play-ink`                             | `#ff6b7e` / `#26070d`             | igual                             | Exclusivo de Jugar. Siempre con texto oscuro (7:1).                 |
| `--favorite`                                        | `#ffe27a`                         | `#a86f00`                         | Estrella de favoritos.                                              |
| `--success` / `--warning` / `--danger`              | verde / ámbar / rojo              | versiones oscuras                 | Listo, requiere revisión, error.                                    |
| `--ambient`                                         | calculado                         | calculado                         | Color del juego en foco; tiñe el fondo y el brillo de las portadas. |

- Los botones primarios que no son Jugar usan tinta invertida (`--ink` de fondo).
- **Color ambiental.** `public/js/art.js` extrae el color dominante de cada portada sobre una miniatura de 24×36 px y lo guarda en el almacenamiento local. Lo aplica como `--art` en la portada y como `--ambient` en el fondo, con una transición de 420 ms.
- Las cabeceras de Inicio y de la página de juego son oscuras por diseño en ambos temas, porque los logos de los juegos suelen ser claros.

## Tipografía

| Familia                      | Uso                                      | Detalles                                                                   |
| ---------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| Bricolage Grotesque Variable | Títulos de página, de sección y de juego | Ancho 78–84 %, peso 650–800. Los títulos de juego grandes usan 78 % y 800. |
| Inter Variable               | Interfaz y texto                         | 14 px de base, cifras tabulares en contadores, horas y valoraciones.       |

Escala: 12, 13, 14, 16, 22, 28–40 y 44–76 px (títulos de juego). Todos los títulos van en oración; no se usan rótulos en mayúsculas.

## Movimiento

| Token        | Valor                            | Uso                                                                   |
| ------------ | -------------------------------- | --------------------------------------------------------------------- |
| `--dur-fast` | 120 ms                           | Botones, colores.                                                     |
| `--dur`      | 200 ms                           | Portadas, barra lateral.                                              |
| `--dur-slow` | 420 ms                           | Color ambiental, entrada de página, transición a la página del juego. |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | Curva general.                                                        |

- Al abrir un juego desde una portada, la portada se expande hasta la cabecera (API de transiciones entre vistas).
- La imagen principal cambia con un fundido entre juegos.
- No hay movimiento que no responda a una acción. `prefers-reduced-motion` desactiva transiciones y animaciones.

## Componentes

| Componente                | Uso                                                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Barra lateral             | 76 px con íconos; se expande a 256 px con el puntero o con foco de teclado. Al pie: «Buscar juegos nuevos» y antigüedad del inventario. «Para revisar» aparece sólo con juegos que necesitan atención, con su cantidad.                                                           |
| Portada                   | Imagen 2:3 sin marco, título en una línea y plataforma o un dato de contexto. Al pasar el mouse se eleva, toma el brillo del juego y muestra Jugar. «Listo» no se muestra; «No instalado» va en gris con un aro y «Requiere revisión» en ámbar.                                   |
| Imagen principal (Inicio) | Arte panorámico a todo el ancho, logo del juego o título, motivo («Seguí donde lo dejaste»), datos, Jugar, Ver ficha y Favorito. Las miniaturas eligen entre cinco destacados.                                                                                                    |
| Fila de Inicio            | Título, explicación breve y desplazamiento horizontal con botones. Flechas izquierda y derecha dentro de la fila; arriba y abajo entre filas.                                                                                                                                     |
| Página del juego          | Cabecera con arte y logo, pestañas subrayadas y una columna fija con Jugar o Instalar, Favorito, Editar, tiempo jugado, última sesión, duración, valoración, progreso y anillo de logros. Volver o Escape regresan al punto de partida.                                           |
| Barra de Biblioteca       | Búsqueda, alcance (Instalados / Toda la cuenta), orden, Filtros y vista (Portadas / Tabla).                                                                                                                                                                                       |
| Panel de filtros          | Columna lateral plegable: «Sólo favoritos» y facetas (tienda, género, duración, tiempo jugado, valoración, etiquetas) con conteos. Las opciones de un grupo se suman; los grupos se combinan. Lógica en `public/catalog.js`.                                                      |
| Tabla                     | Portada, nombre (con «También en» si está en otra tienda), tienda, estado, horas, última sesión, valoración y duración. Columnas ordenables; Jugar e Instalar como botones de ícono.                                                                                              |
| Pantalla «Iniciando…»     | Arte y logo del juego a pantalla completa con el estado del lanzamiento. Se cierra sola, con un clic o con Escape.                                                                                                                                                                |
| Interruptor               | `input[type=checkbox][role=switch]` dentro de `.switch`. Minimizar al jugar y pantalla grande.                                                                                                                                                                                    |
| Pestañas                  | Resumen, Información, Multimedia y, en Steam, Steam y Logros. Roles tablist/tab/tabpanel, flechas, Inicio y Fin.                                                                                                                                                                  |
| Descripción               | En español desde la tienda de Steam cuando existe; si no, la de IGDB con una nota de que está en inglés. Mientras carga se muestra un esqueleto.                                                                                                                                  |
| Arcade                    | Portada = flyer de la máquina; imagen principal = captura en pixel art (`.hero-layer.pixel-art`, `image-rendering: pixelated`); bajo la portada, fabricante y año. En la página del juego, «Acerca de la máquina», «Versiones» (cada una con Jugar) e imágenes de título y juego. |
| Paleta de comandos        | Control+K. Los juegos muestran su portada. Enter juega; Mayús+Enter abre la página del juego.                                                                                                                                                                                     |
| Aviso                     | `notify(mensaje, { type, action })`, apilados abajo a la derecha, con Deshacer o Reintentar.                                                                                                                                                                                      |
| Campo con error           | `showFormErrors(form, [[campo, mensaje]])`, el error junto al campo.                                                                                                                                                                                                              |

## Accesibilidad e interacción (WCAG 2.2 AA)

- Contraste de texto ≥ 4,5:1 y de bordes de controles ≥ 3:1 en ambos temas.
- Foco visible en todos los controles; la selección de una colección se marca sólo mientras la colección tiene el foco.
- Colecciones con un único punto de Tab. En portadas, Enter juega y Espacio abre la página; en la Tabla, Enter abre la página. F marca favorito y E edita.
- La página del juego devuelve el foco al juego de origen al volver.
- Los logos de los juegos tienen el título real como texto alternativo accesible.

## Vistas de la biblioteca

- La Biblioteca abre con los juegos instalados; «Toda la cuenta» suma los juegos de Steam sin instalar.
- **Portadas** para explorar y **Tabla** para ordenar y comparar. Un clic en un juego abre su página.
- Un juego comprado en varias tiendas aparece una vez, con la copia que se puede jugar adelante.

## Mando y modo sala

- `public/gamepad.js` traduce el mando a teclas. En el escritorio: cruceta o palanca = flechas, A = elegir (sobre un juego abre su página), B = Escape, X = favorito, Y = paleta, LB/RB = sección, Menú = modo sala. Donde las flechas no tienen uso, el foco va al elemento más cercano en esa dirección (`pickNeighbor`, con pruebas).
- **Modo sala** (`public/js/couch.js`, `public/couch.css`): una pantalla propia para la TV, no la interfaz agrandada. Se entra con F11, el botón Menú, la paleta o Configuración, y se recuerda entre sesiones.
  - Fondo: el arte del juego enfocado, con sombra a la izquierda y abajo; datos arriba a la izquierda (motivo, logo o título, fabricante o tienda, última sesión, horas, crítica).
  - Inicio: «Destacados» y las filas de Inicio sin repetir juegos. Biblioteca: todos los juegos en filas de siete por letra inicial (`libraryRows`, con pruebas).
  - Alcance: arranca en «Listos para jugar» (instalados y con lanzador, `GMLShelves.playable`), porque el modo sala es para elegir y jugar ya. El botón Vista (⧉), la tecla V, el chip de arriba o el menú pasan a «Toda la colección»: la Biblioteca suma después un bloque «Sin instalar · letra» con las portadas atenuadas y una etiqueta, e Inicio suma «Para instalar». Se recuerda en `gml-couch-scope`.
  - Navegación: la fila enfocada sube a un lugar fijo y su riel se corre para que el juego quede a la vista. Foco: escala 1,1, borde blanco y brillo con el color del juego.
  - Botones: A abre la ficha (Jugar adelante, favorito, volver), B vuelve, X favorito, Y salta a la letra siguiente, LB/RB cambian de sección, Vista alterna listos o todos y Menú abre las opciones. En el modo sala cada botón es una tecla fija (`couchKeys`); el teclado y el mouse también funcionan, y el puntero se esconde a los 2,5 s sin moverse.
  - Medidas relativas a la pantalla (`vw`, `vh`) para verse igual en un monitor y en una TV 4K. Respeta «reducir movimiento».

## Integraciones como fuentes de biblioteca

Steam e IGDB son fuentes de información, no destinos de navegación. La conexión y sincronización se administran en Configuración, y sus datos aparecen en Inicio, en la Biblioteca y en la página de cada juego cuando ayudan a elegir, instalar o conocer un título.
