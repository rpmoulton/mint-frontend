/**
 * Format a numeric string (from the API) as a currency amount.
 * Always uses the given currency code and supports optional plus signs for income.
 */
export function formatCurrency(
  amount: string | number,
  currency = "USD",
  options?: { showPlus?: boolean },
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  if (isNaN(num)) return `${currency || "USD"} 0.00`
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(num))

    if (num < 0) {
      return `-${formatted}`
    }
    if (options?.showPlus && num > 0) {
      return `+${formatted}`
    }
    return formatted
  } catch {
    const formatted = Math.abs(num).toFixed(2)
    const sign = num < 0 ? "-" : options?.showPlus && num > 0 ? "+" : ""
    return `${sign}${currency || "USD"} ${formatted}`
  }
}

/**
 * Format a percentage number for display (e.g. 57.25 -> "57.3%").
 */
export function formatPercentage(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value
  if (isNaN(num)) return "0.0%"
  return `${num.toFixed(1)}%`
}

/**
 * Format a date string (ISO or YYYY-MM-DD) for display.
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T00:00:00`)
  if (isNaN(d.getTime())) return String(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/**
 * Returns initials from a full name (first + last).
 */
export function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.trim()?.charAt(0) || ""
  const l = lastName?.trim()?.charAt(0) || ""
  return (f + l).toUpperCase() || "U"
}

/**
 * Returns the current year/month as { year, month }.
 */
export function currentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

/**
 * Returns a human-readable month name.
 */
export function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString("en-US", { month: "long" })
}

/**
 * Clamps a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Returns whether an amount string represents a negative number.
 */
export function isNegative(amount: string | number): boolean {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return !isNaN(num) && num < 0
}
