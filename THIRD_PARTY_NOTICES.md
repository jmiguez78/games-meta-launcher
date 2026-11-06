# Avisos de terceros

Viciódromo se distribuye bajo la licencia MIT (ver [LICENSE](LICENSE)). Incluye o usa los componentes de terceros que siguen, cada uno con su propia licencia. Esa licencia MIT no alcanza a ninguno de ellos.

## Incluidos en el ejecutable

| Componente | Versión | Licencia | Dónde está el texto completo |
| --- | --- | --- | --- |
| [Electron](https://www.electronjs.org/) (con Chromium y Node.js) | 39 | MIT; Chromium y Node.js, varias licencias abiertas | `LICENSE.electron.txt` y `LICENSES.chromium.html`, junto al ejecutable descomprimido |
| [steam-games-mcp](https://www.npmjs.com/package/steam-games-mcp) | 0.17.0 | MIT (© 2026 Grinv) | `node_modules/steam-games-mcp/LICENSE` |
| [@modelcontextprotocol/core](https://github.com/modelcontextprotocol/typescript-sdk) y [@modelcontextprotocol/server](https://github.com/modelcontextprotocol/typescript-sdk) | 2.3.1 | Apache-2.0 (las contribuciones anteriores, MIT) | `node_modules/@modelcontextprotocol/*/LICENSE` |
| [Zod](https://zod.dev/) | 4.6.7 | MIT (© 2025 Colin McDonnell) | `node_modules/zod/LICENSE` |
| [Inter](https://github.com/rsms/inter) | — | SIL Open Font License 1.1 (© 2016 The Inter Project Authors) | `public/fonts/OFL-inter.txt` |
| [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) | — | SIL Open Font License 1.1 (© 2022 The Bricolage Grotesque Project Authors) | `public/fonts/OFL-bricolage-grotesque.txt` |
| Íconos de trazo basados en [Lucide](https://lucide.dev/) | — | ISC (texto abajo) | Este archivo |

Las herramientas de desarrollo (Electron Builder, Playwright, axe-core, Prettier) no viajan en el ejecutable.

### Lucide

```text
ISC License

Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT).
All other copyright (c) for Lucide are held by Lucide Contributors 2022.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without
fee is hereby granted, provided that the above copyright notice and this permission notice appear
in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## Descargados en tu PC, no incluidos

Estos datos no viajan con Viciódromo: se descargan en tu PC cuando hacen falta y siguen sujetos a las condiciones de cada fuente.

| Fuente | Qué se descarga | Condiciones |
| --- | --- | --- |
| Steam (Valve) | Biblioteca, logros, fichas y arte de la tienda | [Condiciones de la Steam Web API](https://steamcommunity.com/dev/apiterms); cada usuario usa su propia clave |
| [IGDB](https://www.igdb.com/) (Twitch) | Fichas, valoraciones, capturas y videos | [Condiciones de la API de IGDB](https://api-docs.igdb.com/); cada usuario usa su propia aplicación de Twitch |
| [Wikipedia](https://es.wikipedia.org/) y [Wikidata](https://www.wikidata.org/) | Descripciones de juegos de Arcade e identificadores | Textos de Wikipedia: CC BY-SA 4.0, se muestran con enlace al artículo; Wikidata: CC0 |
| [libretro-thumbnails](https://github.com/libretro-thumbnails/MAME) | Portadas, capturas y logos de Arcade | Las del proyecto libretro-thumbnails |
| [AntoPISA / progetto-SNAPS](https://www.progettosnaps.net/support/) | `catver.ini`, `series.ini`, `bestgames.ini` y `command.dat` (categorías, sagas, ranking y movimientos de Arcade) | © AntoPISA. No publican una licencia de redistribución, por eso Viciódromo no los incluye: los descarga de [su repositorio](https://github.com/AntoPISA/MAME_SupportFiles) cada 30 días |

## Marcas

Steam, Epic Games, Xbox, Microsoft Store, Ubisoft Connect, EA app, GOG Galaxy, NVIDIA, IGDB, Twitch y MAME son marcas de sus dueños. Viciódromo no está asociado a ellos ni tiene su respaldo; los nombres se usan sólo para identificar las tiendas y servicios compatibles.
