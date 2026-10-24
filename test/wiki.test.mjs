import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptEntity, createWiki, titleMatches } from '../src/wiki.mjs';
import { formatCommands, glyphs, parseCommandDat } from '../src/mame-commands.mjs';

const entity = (year, extra = {}) => ({
  claims: {
    P31: [{ mainsnak: { datavalue: { value: { id: 'Q7889' } } } }],
    P577: [{ mainsnak: { datavalue: { value: { time: `+${year}-01-01T00:00:00Z` } } } }],
    P5794: [{ mainsnak: { datavalue: { value: 'bubble-bobble' } } }]
  },
  sitelinks: { eswiki: { title: 'Bubble Bobble' } },
  ...extra
});

test('acepta sólo artículos del mismo juego: mismo título, videojuego y año cercano', () => {
  assert.equal(titleMatches('Bubble Bobble', 'Bubble Bobble'), true);
  assert.equal(titleMatches('Contra (video game)', 'Contra'), true);
  assert.equal(titleMatches('1942 (video game)', '1942'), true);
  assert.equal(titleMatches('Contra: Shattered Soldier', 'Contra'), false);
  assert.equal(titleMatches('Battle of Midway', '1942'), false);
  assert.equal(acceptEntity(entity(1986), 1986), true);
  assert.equal(acceptEntity(entity(1995), 1986), false);
  assert.equal(acceptEntity({ claims: { P31: [{ mainsnak: { datavalue: { value: { id: 'Q5' } } } }] } }, 1986), false);
});

test('de Wikipedia en inglés a Wikidata y a la introducción en español', async () => {
  const urls = [];
  const wiki = createWiki({
    fetchImpl: async (url) => {
      urls.push(url);
      const query = new URL(url).searchParams;
      let body = {};
      if (query.get('list') === 'search')
        body = {
          query: { search: [{ title: 'Bubble Bobble' }, { title: 'Bubble Bobble Part 2' }, { title: 'Taito' }] }
        };
      else if (query.get('prop') === 'pageprops')
        body = {
          query: {
            pages: [
              { title: 'Bubble Bobble', pageprops: { wikibase_item: 'Q1' } },
              { title: 'Bubble Bobble Part 2', pageprops: { wikibase_item: 'Q2' } }
            ]
          }
        };
      else if (query.get('action') === 'wbgetentities') body = { entities: { Q1: entity(1986), Q2: entity(1993) } };
      else if (query.get('prop') === 'extracts')
        body = { query: { pages: [{ title: 'Bubble Bobble', extract: 'Bubble Bobble es un videojuego de 1986.' }] } };
      return new Response(JSON.stringify(body), { status: 200 });
    }
  });
  const result = await wiki.lookup({ title: 'Bubble Bobble', year: 1986, manufacturer: 'Taito' });
  assert.deepEqual(result, {
    wikidata: 'Q1',
    igdbSlug: 'bubble-bobble',
    es: {
      title: 'Bubble Bobble',
      url: 'https://es.wikipedia.org/wiki/Bubble_Bobble',
      extract: 'Bubble Bobble es un videojuego de 1986.'
    }
  });
  assert.ok(urls.some((url) => url.startsWith('https://es.wikipedia.org/')));
  // Sin artículos con el mismo título no se adivina.
  const none = createWiki({
    fetchImpl: async () =>
      new Response(JSON.stringify({ query: { search: [{ title: 'Racing Lagoon' }] } }), { status: 200 })
  });
  assert.equal(await none.lookup({ title: 'Racing Beat', year: 1991 }), null);
});

test('movimientos de command.dat en texto legible', () => {
  assert.equal(glyphs('_2_3_6_+_P'), '↓↘→ + P');
  assert.equal(glyphs('^4_6_+_P'), '(mantener ←) → + P');
  assert.equal(glyphs('^*_K'), 'K (repetido)');
  assert.equal(glyphs('@F-button _+ ^s'), 'F + Especial');
  const dat = [
    '$info=sf2ce,sf2ceua',
    '$cmd',
    "Street Fighter II': Champion Edition                        © 1992 Capcom",
    '',
    '- CONTROLS -',
    '────────────────────────────────────────',
    '^E : Weak Punch (_P)',
    '',
    '- HOW TO PLAY -',
    '_@ Special Moves',
    '',
    '- RYU -',
    '────────────────────────────────────────',
    '_( Seoi Nage                                                             _4 / _6_+^F / ^G',
    '_@ Hadou Ken                                                             _2_3_6_+_P',
    '$end',
    '$info=other',
    '$cmd',
    '- CONTROLS -',
    '$end'
  ].join('\n');
  const blocks = parseCommandDat(dat, new Set(['sf2ceua']));
  assert.deepEqual([...blocks.keys()], ['sf2ceua']);
  assert.deepEqual(formatCommands(blocks.get('sf2ceua')), [
    { title: 'Controles', rows: [{ kind: null, label: 'LP', command: 'Puño débil' }], notes: [] },
    {
      title: 'Ryu',
      rows: [
        { kind: 'agarre', label: 'Seoi Nage', command: '← / → + MP / HP' },
        { kind: 'especial', label: 'Hadou Ken', command: '↓↘→ + P' }
      ],
      notes: []
    }
  ]);
});
