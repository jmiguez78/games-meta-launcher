import { test } from 'node:test';
import assert from 'node:assert/strict';
import '../public/gamepad.js';

const { pickNeighbor } = globalThis.GMLGamepad;
const box = (left, top, width = 100, height = 100) => ({ left, top, width, height });

test('el mando elige el elemento más cercano y alineado en cada dirección', () => {
  const from = box(100, 100);
  const candidates = [box(220, 100), box(220, 400), box(100, 220), box(-20, 100), box(100, -20), box(340, 100)];
  assert.equal(pickNeighbor(from, candidates, 'right'), 0);
  assert.equal(pickNeighbor(from, candidates, 'down'), 2);
  assert.equal(pickNeighbor(from, candidates, 'left'), 3);
  assert.equal(pickNeighbor(from, candidates, 'up'), 4);
  assert.equal(pickNeighbor(from, [box(-100, -100)], 'right'), null);
});
