const UNITS = [
  { value: 1e9, suffix: 'B' },
  { value: 1e6, suffix: 'M' },
  { value: 1e3, suffix: 'k' },
];

/**
 * Short counts for views and likes: 999, 1k, 1.1k, 100k, 2.5M. One decimal below 100 of a
 * unit, none from there up. Rounds down, so a count never shows more than it has reached.
 */
export function formatCount(count: number): string {
  for (const { value, suffix } of UNITS) {
    if (count < value) continue;
    // Divide by tenths of the unit, not tenths of the result, to keep float error out of the floor.
    const tenths = Math.floor(count / (value / 10));
    const shown = tenths >= 1000 ? Math.floor(tenths / 10) : tenths / 10;
    return `${shown}${suffix}`;
  }
  return String(count);
}
