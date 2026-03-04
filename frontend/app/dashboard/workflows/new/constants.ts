export const FREQUENCY_OPTIONS = [
  { value: "15m", label: "Every 15 min" },
  { value: "30m", label: "Every 30 min (recommended)" },
  { value: "1h", label: "Every hour" },
  { value: "2h", label: "Every 2 hours" },
] as const

export { SCAN_MAX_HANDLES as MAX_HANDLES } from "@/lib/scan-constraints"

export interface WorkflowFormState {
  name: string
  description: string
  frequency: string
  handles: string[]
}
