export const FREQUENCY_UNIT_OPTIONS = [
  {
    value: "m",
    label: "Minutes",
    shortLabel: "min",
    min: 10,
    max: 59,
    defaultAmount: 10,
  },
  {
    value: "h",
    label: "Hours",
    shortLabel: "hr",
    min: 1,
    max: 23,
    defaultAmount: 1,
  },
  {
    value: "d",
    label: "Days",
    shortLabel: "day",
    min: 1,
    max: 6,
    defaultAmount: 1,
  },
  {
    value: "w",
    label: "Weeks",
    shortLabel: "wk",
    min: 1,
    max: 52,
    defaultAmount: 1,
  },
] as const

export type FrequencyUnit = (typeof FREQUENCY_UNIT_OPTIONS)[number]["value"]

export function isFrequencyUnit(value: string): value is FrequencyUnit {
  return FREQUENCY_UNIT_OPTIONS.some((option) => option.value === value)
}

export function getFrequencyUnitOption(unit: FrequencyUnit) {
  return FREQUENCY_UNIT_OPTIONS.find((option) => option.value === unit)
}

export function parseFrequencyAmount(amountInput: string, unit: FrequencyUnit) {
  const option = getFrequencyUnitOption(unit)
  if (!option) return null

  const parsed = Number(amountInput)
  if (!Number.isInteger(parsed) || parsed < option.min || parsed > option.max) {
    return null
  }

  return parsed
}

export function getFrequencyError(amountInput: string, unit: FrequencyUnit) {
  const option = getFrequencyUnitOption(unit)
  if (!option) return "Choose a valid unit."

  if (!amountInput) {
    return `Range: ${option.min}-${option.max}`
  }

  if (parseFrequencyAmount(amountInput, unit) === null) {
    return `Range: ${option.min}-${option.max}`
  }

  return null
}

export function buildFrequencyValue(amountInput: string, unit: FrequencyUnit) {
  const parsed = parseFrequencyAmount(amountInput, unit)
  if (parsed === null) return null

  return `${parsed}${unit}`
}

export { SCAN_MAX_HANDLES as MAX_HANDLES } from "@/lib/scan-constraints"

export interface WorkflowFormState {
  name: string
  frequencyAmountInput: string
  frequencyUnit: FrequencyUnit
  handles: string[]
}
