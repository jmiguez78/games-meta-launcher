# Contexto visual del proyecto

Launcher local de Windows con Electron, HTML, CSS y JavaScript sin framework.

Los colores y temas se definen en `public/styles/tokens.css`; los controles, en `public/styles/components.css`; cada pantalla, en `public/styles/screens.css` (ver `public/styles.css` para el orden de las capas). Se preservan la identidad actual, la densidad de escritorio, los controles nativos, el foco visible y el funcionamiento sin metadatos.

La ficha se divide en Resumen, Información y Multimedia. La galería usa un diálogo nativo con navegación por flechas, Escape y devolución del foco. Las pestañas conservan su selección al cambiar de juego.

Referencia visual pública: https://21st.dev/@anubra266/components/tabs-component. No se instala React ni Tailwind. La búsqueda del CLI necesita una sesión distinta de la autenticación del MCP de Codex.
