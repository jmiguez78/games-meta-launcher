# Sistema de diseño

## Principios

- La cabecera conserva un guiño lúdico; el resto de la interfaz prioriza lectura y acciones rápidas.
- Cada pantalla responde una pregunta: qué jugar, qué hay instalado, qué necesita atención o qué se quiere configurar.
- Los mensajes indican una siguiente acción y evitan mostrar errores técnicos.

## Tokens

| Categoría | Uso |
| --- | --- |
| Acento | Acción primaria y navegación seleccionada. |
| Éxito y atención | Disponibilidad y necesidad de revisión. |
| Superficie, línea y sombra | Tarjetas, paneles y separación visual. |
| Radio | Bordes de controles y superficies. |

Todos los colores de superficies, textos y bordes se toman de los tokens de `:root` en `public/style.css`; no se escriben colores directos en los componentes claros. Los elementos que ya son oscuros por diseño (barra lateral, banner, portadas y notificaciones) mantienen sus colores propios.

### Temas claro y oscuro

- La paleta oscura redefine los mismos tokens. Se aplica con `data-theme="dark"` o, si no hay elección explícita, cuando Windows usa el tema oscuro (`prefers-color-scheme`).
- `--accent` es el relleno de acciones primarias (texto blanco encima); `--accent-text` es el acento usado como color de texto, más claro en modo oscuro para mantener el contraste.
- La elección (Sistema, Claro u Oscuro) se guarda en `preferences.json` y la aplicación de escritorio la aplica también a la barra de título.

## Componentes

| Componente | Variantes | Uso |
| --- | --- | --- |
| Botón | Primario, secundario, texto | Acciones principales, secundarias y de bajo impacto. |
| Tarjeta de juego | Iconos, lista, detalle | Explorar, comparar o profundizar una ficha. |
| Chips | Normal, activo | Selección de plataforma y filtros visibles. |
| Estado | Éxito, atención, vacío, notificación | Explica disponibilidad, resultados y confirmaciones. |
| Tabla Explorador | Una tabla, encabezados ordenables | Compara toda la biblioteca y cambia el orden desde cada columna. |

## Accesibilidad e interacción

- Los botones tienen texto, etiqueta accesible o título.
- Los estados de aplicación se anuncian mediante regiones vivas.
- Control más K abre la Biblioteca; barra diagonal enfoca la búsqueda; Escape oculta filtros.
- Los focos visibles y los objetivos de interacción mantienen un tamaño cómodo.
