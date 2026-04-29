export function truncateNumber(value: number | string, decimals: number = 2): number {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return 0;
  const factor = 10 ** decimals;
  return Math.trunc(num * factor) / factor;
}

export function formatTruncatedAmount(value: number | string, decimals: number = 2): string {
  return truncateNumber(value, decimals).toFixed(decimals);
}
