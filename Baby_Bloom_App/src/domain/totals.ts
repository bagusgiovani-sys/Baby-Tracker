import type { SavedEvent } from './events.ts';
export function summarize(
  events: SavedEvent[],
  babyId: string,
  range: [number, number],
  now: Date,
) {
  const scoped = events.filter((e) => e.baby_id === babyId && !e.deleted_at);
  const inside = scoped.filter(
    (e) => Date.parse(e.occurred_at) >= range[0] && Date.parse(e.occurred_at) < range[1],
  );
  const feeds = inside.filter((e) => e.event_type === 'feeding');
  const diapers = inside.filter((e) => e.event_type === 'diaper');
  const bottles = feeds.filter(
    (e) => e.event_type === 'feeding' && e.detail.feeding_kind !== 'direct_breast',
  );
  const known = bottles.filter(
    (e) => e.event_type === 'feeding' && e.detail.volume_consumed_ml !== null,
  );
  const intervals = scoped
    .filter((e) => e.event_type === 'sleep')
    .map(
      (e) =>
        [
          Math.max(range[0], Date.parse(e.occurred_at)),
          Math.min(range[1], Date.parse(e.ended_at ?? now.toISOString())),
        ] as [number, number],
    )
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let lastEnd = -Infinity;
  for (const [start, end] of intervals) {
    total += Math.max(0, end - Math.max(start, lastEnd));
    lastEnd = Math.max(lastEnd, end);
  }
  return {
    feeding_count: feeds.length || null,
    wet_count: diapers.length
      ? diapers.filter(
          (e) => e.event_type === 'diaper' && ['wet', 'both'].includes(e.detail.diaper_kind),
        ).length
      : null,
    dirty_count: diapers.length
      ? diapers.filter(
          (e) => e.event_type === 'diaper' && ['dirty', 'both'].includes(e.detail.diaper_kind),
        ).length
      : null,
    sleep_minutes: intervals.length ? total / 60000 : null,
    provisional: scoped.some(
      (e) =>
        e.event_type === 'sleep' &&
        !e.ended_at &&
        Date.parse(e.occurred_at) < Math.min(range[1], now.getTime()) &&
        now.getTime() > range[0],
    ),
    bottle_consumed_ml: known.length
      ? known.reduce(
          (sum, e) => sum + (e.event_type === 'feeding' ? (e.detail.volume_consumed_ml ?? 0) : 0),
          0,
        )
      : null,
    missing_bottle_volume: bottles.length - known.length,
    direct_breast_minutes: feeds
      .filter(
        (e) =>
          e.event_type === 'feeding' && e.detail.feeding_kind === 'direct_breast' && e.ended_at,
      )
      .reduce((sum, e) => sum + (Date.parse(e.ended_at!) - Date.parse(e.occurred_at)) / 60000, 0),
  };
}
