process.env.TZ = 'America/Buenos_Aires';
const { test } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { buildActivity, streaks } = await import('../src/activity.mjs');

// Sábado 31/10/2026, 10:00 en Buenos Aires.
const now = Date.parse('2026-10-31T10:00:00-03:00');
const at = (text) => new Date(text + '-03:00').toISOString();

test('racha actual (viva si se jugó hoy o ayer) y mejor racha', () => {
  assert.deepEqual(streaks(['2026-10-28', '2026-10-29', '2026-10-30'], now), { current: 3, best: 3 });
  assert.deepEqual(streaks(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-24', '2026-10-31'], now), {
    current: 1,
    best: 3
  });
  assert.deepEqual(streaks(['2026-10-28'], now), { current: 0, best: 1 });
});

test('semanas, dos semanas con Steam, más jugados y últimas sesiones', () => {
  const games = [
    { key: 'steam:10', name: 'Counter-Strike', platform: 'Steam', steam: { playtimeHours: 120, recentHours: 3 } },
    { key: 'epic games:x', name: 'Hades', platform: 'Epic Games', playSeconds: 7200 },
    { key: 'arcade:sf2', name: 'Street Fighter II', platform: 'Arcade', playSeconds: 30 }
  ];
  const sessions = [
    { key: 'epic games:x', name: 'Hades', start: at('2026-09-01T20:00:00'), seconds: 1800 }, // fuera de 12 semanas
    { key: 'epic games:x', name: 'Hades', start: at('2026-10-26T21:00:00'), seconds: 3600 }, // lunes: esta semana
    { key: 'steam:10', name: 'Counter-Strike', start: at('2026-10-25T23:30:00'), seconds: 1200 }, // domingo anterior
    { key: 'arcade:sf2', name: 'Street Fighter II', start: at('2026-10-30T22:00:00'), seconds: 30 }
  ];
  const activity = buildActivity({ sessions, games, now });
  assert.equal(activity.weeks.length, 12);
  assert.equal(activity.weeks.at(-1).start, '2026-10-26');
  assert.equal(activity.thisWeekSeconds, 3630);
  assert.equal(activity.weeks.at(-2).seconds, 1200);
  // Hades y Street Fighter medidos (3630 s) + 3 h de Steam; la sesión de Counter-Strike ya la cuenta Steam.
  assert.equal(activity.recentSeconds, 3630 + 3 * 3600);
  assert.deepEqual(
    activity.top.map((game) => [game.key, game.seconds]),
    [
      ['steam:10', 120 * 3600],
      ['epic games:x', 7200]
    ]
  );
  assert.deepEqual(
    activity.recent.map((item) => item.key),
    ['arcade:sf2', 'steam:10', 'epic games:x', 'epic games:x']
  );
  assert.equal(activity.sessions, 4);
  assert.equal(activity.measuredGames, 3);
  assert.deepEqual(activity.streak, { current: 1, best: 2 });
});
