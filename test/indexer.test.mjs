import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  parseGamingRoot,
  parseRegistryJson,
  parseSteamManifest,
  scanLibrary,
  steamArtwork,
  vdfValue,
  xboxArtwork
} from '../src/indexer.mjs';

test('lee un manifiesto de Steam', () => {
  const manifest = `"AppState"
{
	"appid"		"620"
	"Universe"		"1"
	"name"		"Portal 2"
	"installdir"		"Portal 2"
}`;
  assert.deepEqual(parseSteamManifest(manifest), { id: '620', name: 'Portal 2', installDir: 'Portal 2' });
});

test('vdfValue ignora mayúsculas en la clave y devuelve vacío si falta', () => {
  assert.equal(vdfValue('"InstallDir"  "Hades"', 'installdir'), 'Hades');
  assert.equal(vdfValue('"name" "Hades"', 'appid'), '');
});

test('encuentra imágenes de Steam en la carpeta del juego y en subcarpetas con hash', async () => {
  const cache = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-steam-'));
  await fs.mkdir(path.join(cache, '620', 'a1b2'), { recursive: true });
  await fs.writeFile(path.join(cache, '620', 'header.jpg'), '');
  await fs.writeFile(path.join(cache, '620', 'a1b2', 'library_capsule.jpg'), '');
  await fs.writeFile(path.join(cache, '620', 'a1b2', 'library_hero.jpg'), '');
  const art = await steamArtwork('620', cache);
  assert.equal(art.portrait, path.join(cache, '620', 'a1b2', 'library_capsule.jpg'));
  assert.equal(art.landscape, path.join(cache, '620', 'header.jpg'));
  assert.equal(art.hero, path.join(cache, '620', 'a1b2', 'library_hero.jpg'));
  assert.equal(await steamArtwork('999', cache), null);
  await fs.rm(cache, { recursive: true, force: true });
});

test('usa el logo más grande disponible de un juego de Xbox', async () => {
  const location = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-xbox-'));
  await fs.mkdir(path.join(location, 'Content', 'Resources'), { recursive: true });
  await fs.writeFile(path.join(location, 'Content', 'Resources', 'Logo.png'), '');
  const config =
    '<ShellVisuals Square480x480Logo="Resources\\Falta.png" Square150x150Logo="Resources\\Logo.png" BackgroundColor="#000040" />';
  assert.deepEqual(await xboxArtwork(location, config), {
    logo: path.join(location, 'Content', 'Resources', 'Logo.png'),
    background: '#000040'
  });
  await fs.rm(location, { recursive: true, force: true });
});

test('lee las claves del registro que devuelve PowerShell, sean una o varias', () => {
  assert.deepEqual(
    parseRegistryJson('{"key":"HKEY_CURRENT_USER\\\\Software\\\\Valve\\\\Steam","values":{"SteamPath":"d:/steam"}}'),
    [{ key: 'HKEY_CURRENT_USER\\Software\\Valve\\Steam', values: { SteamPath: 'd:/steam' } }]
  );
  assert.equal(parseRegistryJson('[{"key":"A","values":{}},{"key":"B","values":{"n":1}}]')[1].values.n, '1');
  assert.deepEqual(parseRegistryJson(''), []);
  assert.deepEqual(parseRegistryJson('no es JSON'), []);
});

test('lee las carpetas de .GamingRoot (la marca de la app Xbox en cada unidad)', () => {
  const marker = (...folders) =>
    Buffer.concat([
      Buffer.from('RGBX', 'latin1'),
      Buffer.from([folders.length, 0, 0, 0]),
      Buffer.from(folders.map((folder) => folder + '\0').join(''), 'utf16le')
    ]);
  assert.deepEqual(parseGamingRoot(marker('XboxGames')), ['XboxGames']);
  assert.deepEqual(parseGamingRoot(marker('Juegos\\Xbox', 'Más juegos')), ['Juegos\\Xbox', 'Más juegos']);
  assert.deepEqual(parseGamingRoot(Buffer.from('cualquier cosa')), []);
  assert.deepEqual(parseGamingRoot(null), []);
});

// Una PC que no es la de desarrollo: Steam en D:, juegos en H:, Ubisoft, GOG y EA anotados en el registro.
test('encuentra los juegos de otra PC sin rutas fijas', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gml-otra-pc-'));
  const at = (...parts) => path.join(root, ...parts);
  const file = async (target, text = '') => {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, text);
  };
  const manifest = (id, name, dir) =>
    `"AppState"\n{\n\t"appid"\t\t"${id}"\n\t"name"\t\t"${name}"\n\t"installdir"\t\t"${dir}"\n}`;
  const xboxConfig = (name, identity) =>
    `<Game><Identity Name="${identity}"/><ShellVisuals DefaultDisplayName="${name}"/><Executable Name="g.exe" Id="Game"/></Game>`;
  try {
    // Steam instalado en D:, con una segunda biblioteca en H:.
    const steamDir = at('D', 'Programas', 'Steam');
    const library = at('H', 'Juegos Steam');
    await file(path.join(steamDir, 'steamapps', 'appmanifest_620.acf'), manifest('620', 'Portal 2', 'Portal 2'));
    await file(path.join(steamDir, 'steamapps', 'common', 'Portal 2', 'portal2.exe'));
    await file(
      path.join(steamDir, 'steamapps', 'libraryfolders.vdf'),
      `"libraryfolders"\n{\n\t"1"\n\t{\n\t\t"path"\t\t"${library.replaceAll('\\', '\\\\')}"\n\t}\n}`
    );
    await file(path.join(library, 'steamapps', 'appmanifest_400.acf'), manifest('400', 'Portal', 'Portal'));
    await file(path.join(library, 'steamapps', 'common', 'Portal', 'hl2.exe'));
    // Xbox: una biblioteca con nombre propio en H: (anotada en .GamingRoot) y la de siempre en C:.
    await file(
      at('H', '.GamingRoot'),
      Buffer.concat([Buffer.from('RGBX\x01\0\0\0', 'latin1'), Buffer.from('Mis Juegos Xbox\0', 'utf16le')])
    );
    await file(at('H', 'Mis Juegos Xbox', 'Halo', 'Content', 'MicrosoftGame.config'), xboxConfig('Halo', 'MS.Halo'));
    await file(at('C', 'XboxGames', 'Forza', 'Content', 'MicrosoftGame.config'), xboxConfig('Forza', 'MS.Forza'));
    // Epic, en el ProgramData de esa PC.
    await file(
      at('C', 'ProgramData', 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests', 'a.item'),
      JSON.stringify({
        DisplayName: 'Hades',
        InstallLocation: at('H', 'Epic', 'Hades'),
        AppName: 'Min',
        CatalogItemId: 'h1'
      })
    );
    await file(at('H', 'Epic', 'Hades', 'Hades.exe'));
    // Ubisoft (registro, con barra final) y una carpeta UbisoftLibrary que el registro no menciona.
    await file(at('D', 'Ubisoft', 'Anno 1800', 'Anno1800.exe'));
    await file(at('D', 'UbisoftLibrary', 'Far Cry 6', 'FarCry6.exe'));
    // GOG: el registro apunta a una carpeta que también está en «GOG Games»: tiene que aparecer una vez.
    await file(at('H', 'GOG Games', 'The Witcher', 'unins000.exe'));
    await file(at('H', 'GOG Games', 'The Witcher', 'bin', 'witcher.exe'));
    // EA: registro con «Install Dir» y la propia app EA, que no es un juego.
    await file(at('H', 'EA', 'Mass Effect', 'MassEffect.exe'));
    const registry = {
      'HKCU\\Software\\Valve\\Steam': [
        { key: 'HKEY_CURRENT_USER\\Software\\Valve\\Steam', values: { SteamPath: steamDir.replaceAll('\\', '/') } }
      ],
      'HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs': [
        { key: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs', values: {} },
        {
          key: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs\\4553',
          values: { InstallDir: at('D', 'Ubisoft', 'Anno 1800') + path.sep }
        }
      ],
      'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games': [
        {
          key: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\GOG.com\\Games\\1207658924',
          values: {
            gameID: '1207658924',
            gameName: 'The Witcher: Enhanced Edition',
            path: at('H', 'GOG Games', 'The Witcher'),
            exe: at('H', 'GOG Games', 'The Witcher', 'bin', 'witcher.exe')
          }
        }
      ],
      'HKLM\\SOFTWARE\\WOW6432Node\\Electronic Arts': [
        {
          key: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Electronic Arts\\EA Desktop',
          values: { InstallDir: at('C', 'EA Desktop') }
        },
        {
          key: 'HKEY_LOCAL_MACHINE\\SOFTWARE\\WOW6432Node\\Electronic Arts\\Mass Effect',
          values: { 'Install Dir': at('H', 'EA', 'Mass Effect') }
        }
      ]
    };
    const env = {
      drives: async () => ['C', 'D', 'H'],
      root: (letter) => at(letter),
      programData: at('C', 'ProgramData'),
      registry: async (key) => registry[key] ?? []
    };
    const { games } = await scanLibrary({ env, output: null });
    const byPlatform = (platform) =>
      games
        .filter((game) => game.platform === platform)
        .map((game) => game.name)
        .sort();
    assert.deepEqual(byPlatform('Steam'), ['Portal', 'Portal 2']);
    assert.deepEqual(byPlatform('Xbox / Microsoft Store'), ['Forza', 'Halo']);
    assert.deepEqual(byPlatform('Epic Games'), ['Hades']);
    assert.deepEqual(byPlatform('Ubisoft Connect'), ['Anno 1800', 'Far Cry 6']);
    assert.deepEqual(byPlatform('GOG Galaxy'), ['The Witcher: Enhanced Edition']);
    assert.deepEqual(byPlatform('EA app'), ['Mass Effect']);
    const find = (name) => games.find((game) => game.name === name);
    assert.equal(find('Portal').launch.target, 'steam://run/400');
    assert.deepEqual(find('Anno 1800').launch, { type: 'uri', target: 'uplay://launch/4553/0', available: true });
    assert.equal(find('Anno 1800').key, 'ubisoft connect:4553');
    assert.equal(find('Far Cry 6').launch, null);
    assert.equal(
      find('The Witcher: Enhanced Edition').launch.target,
      at('H', 'GOG Games', 'The Witcher', 'bin', 'witcher.exe')
    );
    assert.equal(find('Mass Effect').launch.target, at('H', 'EA', 'Mass Effect', 'MassEffect.exe'));
    assert.equal(find('Halo').launch.target, 'MS.Halo!Game');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
