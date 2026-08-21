export type KpiRange = { from: Date; to: Date };

export function thisWeekRange(now: Date = new Date()): KpiRange {
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;
  startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  endOfWeek.setMilliseconds(-1);
  return { from: startOfWeek, to: endOfWeek };
}

export function presetRange(
  preset: 'today' | 'week' | 'last30',
  now: Date = new Date(),
): KpiRange {
  if (preset === 'today') {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(from.getDate() + 1);
    to.setMilliseconds(-1);
    return { from, to };
  }
  if (preset === 'last30') {
    const to = new Date(now);
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { from, to };
  }
  return thisWeekRange(now);
}
