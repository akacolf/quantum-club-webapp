export function truncateNumber(value: number | string, decimals: number = 2): number {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return 0;
  const factor = 10 ** decimals;
  return Math.trunc(num * factor) / factor;
}

export function formatTruncatedAmount(value: number | string, decimals: number = 2): string {
  return truncateNumber(value, decimals).toFixed(decimals);
}

export function formatCompactAmount(value: number | string, decimals: number = 2): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return "0";

  const abs = Math.abs(num);
  const units = [
    { value: 1_000_000_000_000, suffix: "T" },
    { value: 1_000_000_000, suffix: "B" },
    { value: 1_000_000, suffix: "M" },
    { value: 1_000, suffix: "K" },
  ];

  const unit = units.find((item) => abs >= item.value);
  if (!unit) return formatTruncatedAmount(num, decimals);

  return `${formatTruncatedAmount(num / unit.value, decimals)}${unit.suffix}`;
}
