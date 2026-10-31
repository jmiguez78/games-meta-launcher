// «Tu actividad»: resumen del tiempo jugado. Las sesiones las mide el launcher (sessions.json); Steam aporta
// además sus horas totales y las de las últimas dos semanas, también de lo jugado fuera del launcher.
// Fechas en la hora local del equipo: la semana empieza el lunes.
const DAY = 86400000;
const WEEKS = 12;

const localDay = (time) => {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date;
};
const dayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function weekStart(time) {
  const date = localDay(time);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
}
const isSteam = (game) => game?.steam && Number.isFinite(game.steam.playtimeHours);

// Días seguidos con al menos una sesión. La racha actual sigue viva si se jugó hoy o ayer.
export function streaks(days, now) {
  const set = new Set(days);
  let best = 0;
  for (const day of set) {
    const date = new Date(day + 'T00:00:00');
    date.setDate(date.getDate() - 1);
    if (set.has(dayKey(date))) continue; // no empieza una racha
    let length = 0;
    const cursor = new Date(day + 'T00:00:00');
    while (set.has(dayKey(cursor))) {
      length += 1;
      cursor.setDate(cursor.getDate() + 1);
    }
    best = Math.max(best, length);
  }
  const cursor = localDay(now);
  if (!set.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let current = 0;
  while (set.has(dayKey(cursor))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { current, best };
}

export function buildActivity({ sessions = [], games = [], now = Date.now() }) {
  const byKey = new Map(games.map((game) => [game.key, game]));
  const valid = sessions.filter((item) => Number.isFinite(Date.parse(item.start)) && item.seconds > 0);

  // Semanas: de la más vieja a la actual, siempre 12 (las vacías en cero).
  const thisWeek = weekStart(now);
  const weeks = Array.from({ length: WEEKS }, (_, index) => {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - (WEEKS - 1 - index) * 7);
    return { start: dayKey(start), seconds: 0, sessions: 0 };
  });
  const weekIndex = new Map(weeks.map((week, index) => [week.start, index]));
  for (const item of valid) {
    const index = weekIndex.get(dayKey(weekStart(Date.parse(item.start))));
    if (index === undefined) continue;
    weeks[index].seconds += item.seconds;
    weeks[index].sessions += 1;
  }

  // Últimas dos semanas: Steam informa sus juegos (también lo jugado fuera del launcher); del resto, lo medido.
  const twoWeeksAgo = now - 14 * DAY;
  const recentSeconds =
    valid
      .filter((item) => Date.parse(item.start) >= twoWeeksAgo && !isSteam(byKey.get(item.key)))
      .reduce((sum, item) => sum + item.seconds, 0) +
    games.filter(isSteam).reduce((sum, game) => sum + (game.steam.recentHours || 0) * 3600, 0);

  // Más jugados: horas de Steam o, en las demás tiendas y Arcade, las medidas por el launcher.
  const top = games
    .map((game) => ({
      key: game.key,
      name: game.name,
      platform: game.platform,
      seconds: isSteam(game) ? game.steam.playtimeHours * 3600 : Number(game.playSeconds) || 0,
      recentSeconds: isSteam(game) ? (game.steam.recentHours || 0) * 3600 : 0
    }))
    .filter((game) => game.seconds >= 60)
    .sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name, 'es'))
    .slice(0, 8);

  const recent = valid
    .slice(-12)
    .reverse()
    .map((item) => ({
      key: item.key,
      name: byKey.get(item.key)?.name ?? item.name,
      platform: byKey.get(item.key)?.platform ?? null,
      start: item.start,
      seconds: item.seconds
    }));

  return {
    weeks,
    thisWeekSeconds: weeks.at(-1).seconds,
    recentSeconds: Math.round(recentSeconds),
    streak: streaks(
      valid.map((item) => dayKey(localDay(Date.parse(item.start)))),
      now
    ),
    sessions: valid.length,
    measuredGames: new Set(valid.map((item) => item.key)).size,
    top,
    recent
  };
}
