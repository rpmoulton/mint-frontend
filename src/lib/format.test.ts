import { describe, it, expect } from "vitest"
import {
  formatCurrency,
  formatPercentage,
  formatDate,
  isNegative,
  getInitials,
} from "./format"

describe("formatCurrency", () => {
  it("formats positive USD amounts correctly", () => {
    expect(formatCurrency("1250.50", "USD")).toBe("$1,250.50")
    expect(formatCurrency(1250.5, "USD")).toBe("$1,250.50")
  })

  it("formats negative amounts with a leading minus sign", () => {
    expect(formatCurrency("-142.30", "USD")).toBe("-$142.30")
    expect(formatCurrency(-89.15, "USD")).toBe("-$89.15")
  })

  it("supports showPlus option for income display", () => {
    expect(formatCurrency("4250.00", "USD", { showPlus: true })).toBe("+$4,250.00")
    expect(formatCurrency("0.00", "USD", { showPlus: true })).toBe("$0.00")
  })

  it("handles alternative currencies like EUR and GBP", () => {
    const eur = formatCurrency("100.00", "EUR")
    expect(eur).toContain("100.00")

    const gbp = formatCurrency("50.00", "GBP")
    expect(gbp).toContain("50.00")
  })

  it("handles zero and invalid inputs safely", () => {
    expect(formatCurrency("0", "USD")).toBe("$0.00")
    expect(formatCurrency("invalid", "USD")).toBe("USD 0.00")
  })
})

describe("formatPercentage", () => {
  it("formats percentages to 1 decimal place", () => {
    expect(formatPercentage(57.25176)).toBe("57.3%")
    expect(formatPercentage("90.819")).toBe("90.8%")
    expect(formatPercentage(0)).toBe("0.0%")
  })

  it("handles invalid percentage values", () => {
    expect(formatPercentage("NaN")).toBe("0.0%")
  })
})

describe("formatDate", () => {
  it("formats ISO date strings consistently", () => {
    const formatted = formatDate("2026-11-03T18:18:49Z")
    expect(formatted).toContain("Nov")
    expect(formatted).toContain("2026")
  })

  it("formats YYYY-MM-DD date strings", () => {
    const formatted = formatDate("2026-11-01")
    expect(formatted).toContain("Nov")
    expect(formatted).toContain("2026")
  })

  it("returns dash for null or undefined dates", () => {
    expect(formatDate(null)).toBe("—")
    expect(formatDate(undefined)).toBe("—")
  })
})

describe("isNegative and getInitials", () => {
  it("detects negative numbers accurately", () => {
    expect(isNegative("-10.50")).toBe(true)
    expect(isNegative(-5)).toBe(true)
    expect(isNegative("0")).toBe(false)
    expect(isNegative("10.50")).toBe(false)
  })

  it("extracts user initials", () => {
    expect(getInitials("Alex", "Morgan")).toBe("AM")
    expect(getInitials("John", "")).toBe("J")
    expect(getInitials("", "")).toBe("U")
  })
})
