import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayName } from '../src/names.mjs';

test('los nombres pierden marcas y sufijos técnicos de las tiendas', () => {
  assert.equal(displayName('A Plague Tale: Requiem - Windows'), 'A Plague Tale: Requiem');
  assert.equal(displayName('Cities: Skylines II - PC Edition'), 'Cities: Skylines II');
  assert.equal(displayName('Forza Horizon 5 PC Edition'), 'Forza Horizon 5');
  assert.equal(displayName('Microsoft Flight Simulator for Windows 10'), 'Microsoft Flight Simulator');
  assert.equal(displayName('DOOM® Eternal™'), 'DOOM Eternal');
  assert.equal(displayName('Halo (PC)'), 'Halo');
});

test('los nombres que no tienen sufijos técnicos no cambian', () => {
  for (const name of [
    'Windows 95 Tips',
    'Windowsill',
    'Assetto Corsa EVO',
    'Batman: Arkham City GOTY',
    'Clair Obscur: Expedition 33'
  ])
    assert.equal(displayName(name), name);
  assert.equal(displayName('  Hades  '), 'Hades');
});
