# Sistema de diseño

## Principios

- La cabecera y el banner de Inicio conservan un guiño lúdico; el resto de la interfaz prioriza lectura y acciones rápidas.
- Cada pantalla responde una pregunta: qué jugar, qué hay instalado, qué necesita atención o qué se quiere configurar.
- Jugar es siempre la acción principal; favorito y edición son secundarias y no compiten visualmente con ella.
- Los mensajes indican una siguiente acción y evitan mostrar errores técnicos.

## Archivos

- `public/style.css`: tokens de color, temas claro y oscuro, estructura de la aplicación y estilos base.
- `public/ui.css`: sistema visual 2.0 — escala de espaciado, controles, foco y componentes de cada pantalla.
- Los íconos son SVG de trazo (estilo Lucide, licencia ISC) definidos en `public/app.js` (`iconPaths`). En el HTML se insertan con `data-icon="nombre"`; no se usan glifos Unicode como íconos.

## Tokens

| Categoría | Tokens | Uso |
| --- | --- | --- |
| Color | `--accent`, `--accent-text`, `--success`, `--warning`, `--danger`, `--ink`, `--muted`, `--surface`… | Definidos en `style.css` para ambos temas. |
| Espaciado | `--space-1` a `--space-6` (4, 8, 12, 16, 24 y 32 px) | Separaciones internas y entre bloques. |
| Controles | `--control-height` (40 px), `--control-radius` (10 px), `--control-border` | Botones, campos, selectores y segmentos. |
| Foco | `--focus-ring` | Contorno de 2 px en todo control enfocado con teclado. |

Todos los colores de superficies, textos y bordes salen de tokens; los elementos oscuros por diseño (barra lateral, banner, portadas y notificaciones) mantienen sus colores propios.

### Temas claro y oscuro

- La paleta oscura redefine los mismos tokens. Se aplica con `data-theme="dark"` o, si no hay elección explícita, cuando Windows usa el tema oscuro (`prefers-color-scheme`).
- `--accent` es el relleno de acciones primarias (texto blanco encima); `--accent-text` es el acento usado como color de texto, más claro en modo oscuro para mantener el contraste.
- La elección (Sistema, Claro u Oscuro) se guarda en `preferences.json` y la aplicación de escritorio la aplica también a la barra de título.

## Componentes

| Componente | Variantes | Uso |
| --- | --- | --- |
| Botón | Primario, secundario, pequeño, texto, ícono | Acciones principales, secundarias y de bajo impacto. Los botones de ícono siempre tienen nombre accesible. |
| Control segmentado | Con ícono y texto | Cambiar la vista de la biblioteca y el tema. Estado con `aria-pressed`. |
| Chip | Filtro, filtro activo removible | Plataformas y filtros aplicados. |
| Portada | Cuadrícula (Biblioteca, Inicio) | Imagen 2:3, título, plataforma y estado; Jugar aparece con hover o foco. |
| Fila de juego | Lista, Detalle | Miniatura, título, estado, última partida y acciones. |
| Ficha | Panel de detalle | Imagen panorámica, datos de IGDB, acciones, progreso, notas y detalles técnicos plegables. |
| Tabla | Biblioteca, Diagnóstico | `<table>` semántica; encabezados ordenables con `aria-sort`. |
| Estadística | Inicio, Diagnóstico | Rótulo, valor y aclaración. |
| Estado | Carga, error, vacío, sin resultados | Esqueletos durante la carga; error con Reintentar; vacío con una acción concreta. |
| Aviso | Información, éxito, error, en curso | `notify(mensaje, { type, action })`. Se apilan abajo a la derecha (máximo tres) en una región viva educada. Éxito e información se cierran solos (5 s, 8 s con acción) y se pausan con el puntero o el foco encima; errores y operaciones en curso quedan hasta cerrarlos o hasta que termina la operación (`update`). La acción ofrece Deshacer o Reintentar; Escape cierra el aviso enfocado. El diálogo `say()` queda sólo para explicar por qué un juego requiere revisión. |
| Campo con error | Error de campo, error de formulario | `showFormErrors(form, [[campo, mensaje]])`. El mensaje aparece debajo del campo con `aria-invalid` y `aria-describedby`, y el foco va al primer campo con error; se borra al corregir el campo. Los errores del servidor van al `.form-error` del formulario. Los diálogos sólo se cierran si se guardó todo. |
| Paleta de comandos | Juegos, secciones, acciones | Control más K o el botón «Buscar o ir a…». Combobox con lista agrupada y `aria-activedescendant`: el foco queda en el campo, las flechas mueven la opción activa, Enter la ejecuta y Mayús más Enter abre la ficha del juego. Busca sin distinguir tildes. |

## Accesibilidad e interacción (WCAG 2.2 AA)

- Contraste: texto ≥ 4,5:1 y bordes de controles ≥ 3:1 en ambos temas.
- Foco visible en todos los controles; se respeta `prefers-reduced-motion`.
- Colecciones (portadas, filas y tabla) con un único punto de Tab: las flechas recorren los juegos, Enter juega, F marca favorito y E edita. El foco vuelve al mismo juego tras cada cambio.
- La navegación lateral marca la página con `aria-current`; el contador de resultados es la región viva, no la grilla.
- Atajos globales: Control más K abre y cierra la paleta de comandos; la barra diagonal abre la Biblioteca y enfoca la búsqueda; Escape oculta los filtros.
- Al cerrarse un aviso con el foco adentro, el foco vuelve a donde estaba antes de entrar.
- Todos los campos tienen etiqueta y todos los botones un nombre accesible, aunque sólo muestren un ícono.
