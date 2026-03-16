/**
 * Formats a number as a currency amount with commas and 2 decimal places.
 * Examples:
 *   formatAmount(1234567.89) => "1,234,567.89"
 *   formatAmount(0) => "0.00"
 *   formatAmount(1000) => "1,000.00"
 */
export function formatAmount(value: number | string | undefined | null): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formats a number with commas but NO decimal places.
 * For display of whole-number amounts where decimals aren't needed.
 * Examples:
 *   formatWholeAmount(1234567) => "1,234,567"
 */
export function formatWholeAmount(value: number | string | undefined | null): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US");
}
