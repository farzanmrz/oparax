// Non-production recording stays open until issue 1 names the first public stage.
const NON_PRODUCTION_CONTENT_ALLOWED = process.env.VERCEL_ENV !== "production";
const PUBLIC_LEDGER_STAGES = new Set<string>();

// Unknown stages stay closed in production.
export function aiContentAllowed(ledgerStage: string): boolean {
  return PUBLIC_LEDGER_STAGES.has(ledgerStage) || NON_PRODUCTION_CONTENT_ALLOWED;
}
