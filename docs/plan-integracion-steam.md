# Plan de integración de Steam

Propuesta del 23 de octubre de 2026. Estado: implementado en 0.14.0. Las entregas originalmente propuestas se consolidaron en una sola versión.

## Punto de partida comprobado

- Games Meta Launcher 0.13.0 detecta instalaciones locales y conserva preferencias personales.
- El MCP comunitario `steam-games-mcp` 0.17.0 está configurado en Codex y autenticado.
- Una consulta con `get_owned_games(limit: 300)` devolvió los 266 juegos reportados por Steam, sin duplicados.
- El último inventario local, generado el 23 de octubre de 2026, contiene 37 juegos de Steam. Los 37 pertenecen al conjunto reportado por la cuenta.
- Hay 229 juegos de la cuenta sin instalación detectada en ese inventario. Deben revalidarse mediante un escaneo local al implementar la integración.
- El MCP devuelve 50 juegos por defecto y admite hasta 300. Hoy alcanza para esta cuenta; una implementación general no debe asumir que siempre devuelve toda la biblioteca.

## Objetivo

Ampliar la biblioteca unificada con juegos de la cuenta de Steam, estén instalados o no, y enriquecer cada ficha con actividad, logros e información de la tienda. Mantener IGDB, las otras plataformas y la personalización actual.

## Entregas propuestas

| Entrega | Información y acciones | Resultado verificable |
| --- | --- | --- |
| 0.14.0 — Biblioteca de cuenta | Juegos reportados por Steam, App ID, pertenencia a la cuenta, instalación local y filtros Todos / Instalados / No instalados. Botón para abrir la instalación en Steam. | La sincronización completa coincide con el total remoto, identifica las instalaciones por App ID y no duplica juegos ni pierde favoritos o notas. Los no instalados no se muestran como errores de diagnóstico. |
| 0.15.0 — Actividad | Horas totales, horas de las últimas dos semanas, juegos recientes, orden por tiempo y colección sin tiempo registrado. | Coinciden con los datos devueltos por Steam, incluidos los juegos iniciados fuera del launcher. Los valores desconocidos no se convierten en cero. |
| 0.16.0 — Logros | Porcentaje y cantidad desbloqueada, pendientes, descripción y rareza global cuando hay datos. | Se validan juegos con logros, sin logros y con información no accesible. El porcentaje no cambia automáticamente el progreso personal a «Completado». |
| 0.17.0 — Tienda y lista de deseados | Reseñas de usuarios, tendencias, idiomas, mando, sistemas operativos, requisitos, compatibilidad Deck/SteamOS, lista de deseados, precio y descuento actuales por región. | Cada dato indica su fuente y fecha. Los precios muestran la moneda real recibida y los DLC publicados se distinguen de los poseídos. |
| Posterior — Descubrimiento y funciones sociales | Noticias y notas de parche, juegos seguidos, recomendaciones sobre el catálogo propio, amigos que poseen un juego, biblioteca compartida entre dos perfiles y opciones cooperativas. | Funciones opcionales; información social sólo cuando Steam permite consultarla. Sin publicaciones ni compras automáticas. |

## Diseño de biblioteca

Separar tres conceptos en el modelo:

1. **Cuenta:** Steam reporta que el juego está en la biblioteca, no lo reporta o la información está pendiente/no disponible.
2. **Instalación:** instalado en esta PC, sin instalación detectada o estado por verificar.
3. **Lanzamiento:** listo para jugar, requiere revisión o corresponde abrir la instalación en Steam.

Usar el identificador existente `steam:<appid>` para unir ambos inventarios. Conservar juegos instalados aunque una consulta de cuenta falle o no los incluya. Los juegos de cuenta sin instalación no requieren una ruta local ficticia: el modelo actual calcula la unidad desde la ruta y deberá adaptarse.

En la interfaz:

- Filtros de pertenencia e instalación independientes del filtro de tienda.
- Contadores explícitos para la biblioteca completa y los juegos instalados.
- En no instalados, reemplazar Jugar por una acción que abra Steam para instalar. El cliente de Steam administra la descarga; el MCP es de sólo lectura.
- Resumen con horas y actividad; Información con compatibilidad/requisitos; Multimedia conserva IGDB; añadir Logros cuando corresponda.
- Conservar por separado la fecha del último inicio desde el launcher. El MCP actual no expone una fecha exacta de última sesión en su respuesta de biblioteca.

## Papel de cada fuente

| Fuente | Autoridad principal |
| --- | --- |
| Escáner local | Instalación en esta PC, ubicación y lanzamiento. |
| Steam | Biblioteca de cuenta, tiempo registrado, logros, reseñas y características específicas de la versión de Steam. |
| IGDB | Historia, colecciones, franquicias, relaciones entre juegos, ficha editorial y recursos multimedia disponibles. |
| Usuario | Favoritos, notas, etiquetas, puntuación y progreso personal. |

No sobrescribir preferencias personales con datos externos. Mantener origen y fecha de actualización para resolver discrepancias entre IGDB y Steam.

## Integración técnica

El MCP está conectado a Codex para explorar y comprobar datos durante el desarrollo. El portable incluye ahora su propia conexión con Steam.

Para la aplicación, se propone un conector en el backend local, con una interfaz separada del catálogo. Usaría las APIs de Steam verificadas mediante el MCP, de modo que el portable pueda funcionar sin Codex instalado. Un cliente MCP embebido es una alternativa, pero introduce una dependencia de ejecución adicional que deberá justificarse.

- Configuración de Steam en la aplicación con credenciales cifradas mediante Windows DPAPI y sin exponerlas al navegador.
- Caché de cuenta separada del inventario local y de las preferencias. La interfaz fusiona las fuentes por App ID.
- Sincronización manual de biblioteca y actividad; luego incorporar actualización en segundo plano como parte del flujo de la aplicación.
- Consultar fichas detalladas y logros al abrir un juego o por lotes limitados, con caché; evitar consultar todos los datos de los 266 juegos en cada inicio.
- Conservar el último resultado válido ante falta de conexión, clave inválida o cambios de privacidad. Mostrar que la información está desactualizada.
- Validar que la respuesta de biblioteca sea completa antes de interpretar ausencias. El límite de 300 del MCP requiere otra estrategia si la cuenta supera ese tamaño.
- No asociar juegos de tiendas distintas sólo por nombre; sus instalaciones y licencias siguen siendo independientes.

## Alcance y límites

- La biblioteca reportada no equivale a una auditoría exhaustiva de licencias, préstamos familiares o suscripciones. Steam puede omitir juegos gratuitos nunca ejecutados y otros casos no cubiertos por el endpoint.
- La instalación se determina localmente: poseer un juego no informa en qué PC está instalado ni garantiza que funcione en este sistema.
- Tiempo jugado, desbloqueo de logros y progreso narrativo son datos diferentes. Cero horas significa «sin tiempo registrado», no una prueba absoluta de que nunca se jugó.
- El MCP limita las listas de logros devueltas. Para una lista completa en juegos grandes, hay que ampliar el conector o mostrar claramente que el resultado es parcial.
- El precio actual no informa cuánto se pagó por el juego ni su historial de compras.
- El catálogo de DLC de una ficha no permite afirmar cuáles posee la cuenta sin una comprobación adicional.
- No se incluye sincronización de partidas guardadas ni lectura del progreso interno de cada juego.
- No se cambian las preferencias de privacidad de la cuenta para habilitar funciones.

## Primera entrega recomendada

Implementar 0.14.0 y dejar preparado el almacenamiento de las horas ya incluidas en la respuesta de biblioteca. Mostrar esas horas puede incorporarse a esa entrega si no retrasa el cruce fiable de pertenencia e instalación.

La aceptación se comprueba con los datos vigentes al sincronizar: biblioteca remota completa, ninguna duplicación por App ID, instalaciones reescaneadas, datos personales intactos y funcionamiento sin conexión con la última caché válida.

## Implementación entregada en 0.14.0

Se implementaron biblioteca, actividad, logros, tienda, deseados, seguidos, noticias, recomendaciones, amigos, comparación y propietarios entre amigos. Las acciones de instalación abren el cliente de Steam. Los modos cooperativos se muestran como características de la tienda; poseer un mismo juego no garantiza compatibilidad multijugador.

El MCP incluido se ejecuta con el runtime de Electron sin depender de Codex. Biblioteca y logros completos usan APIs oficiales para evitar límites de las herramientas. La última actividad viene del endpoint oficial aunque el MCP la omita. Los precios se completan con `get_prices` para indicar moneda real.

Verificación de cuenta: 266 juegos, 37 instalados y 229 sin instalación detectada. Las reseñas individuales redirigen actualmente a la portada de Steam: se muestra su indisponibilidad y se conserva la valoración agregada y el historial. Las comparaciones indican cuántos resultados se muestran cuando el MCP recorta la lista.

Las secciones anteriores documentan el diseño original. La primera entrega recomendada y las fases posteriores están completadas en esta versión.

## Referencias

- [MCP instalado: herramientas y límites](https://github.com/Grinv/steam-games-mcp#tools).
- [Steam IPlayerService: biblioteca y actividad](https://partner.steamgames.com/doc/webapi/IPlayerService).
- [Steam ISteamUserStats: logros](https://partner.steamgames.com/doc/webapi/ISteamUserStats).

Los límites concretos del MCP también se verificaron mediante `tools/list` en la instalación local; pueden diferir de versiones posteriores del repositorio.

## Ajuste de producto en 0.14.1

Steam es una fuente de enriquecimiento de la biblioteca, no un destino principal de navegación. Se retira el panel independiente y sus listados de deseados, seguidos, recomendaciones y amigos. Las capacidades del conector permanecen disponibles para futuras funciones centradas en la biblioteca. La sincronización se ubica en Configuración. Se conservan todos los juegos instalados y no instalados, filtros, vistas y datos contextuales de las fichas.
