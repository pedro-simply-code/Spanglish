/** UTC calendar month as `YYYY-MM` (matches payout batch periods). */
export function utcMonthKey(now: Date) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function shiftUtcMonth(month: string, delta: number) {
  const [year, value] = month.split("-").map(Number);
  if (!year || !value) return month;
  const date = new Date(Date.UTC(year, value - 1 + delta, 1));
  return utcMonthKey(date);
}

export function clampMonth(month: string, minMonth: string, maxMonth: string) {
  if (month < minMonth) return minMonth;
  if (month > maxMonth) return maxMonth;
  return month;
}

export function earliestMonthKey(months: string[], ceiling: string) {
  if (!months.length) return ceiling;
  return months.reduce((min, value) => (value < min ? value : min), ceiling);
}