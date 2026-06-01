// Operator-facing prefill defaults for the prompt-lab scan inputs. The scan
// SYSTEM prompt is NOT here — it lives in lib/scan/prompt.ts (buildScanInstructions),
// tuned in code. Only what the operator edits on the page is prefilled here.

// Default run name prefilled into the lab.
export const DEFAULT_RUN_NAME = "FC Barcelona news"

// Default monitored handles prefilled into the lab (football beat reporters).
export const DEFAULT_HANDLES = [
  "talkfcb_",
  "EduardoHagn",
  "FabrizioRomano",
  "DavidOrnstein",
  "Glongari",
  "cfcpys",
  "Barza_Buzz",
  "Messilizer0",
  "fcbarcelona",
  "BarcaSpaces",
  "NealGardner_",
]

// Default scan USER prompt (what to search for).
export const DEFAULT_SCAN_USER_PROMPT =
  "All news around FC Barcelona, including transfers, league news, rumors, murmurs, and anything relevant around the club."
