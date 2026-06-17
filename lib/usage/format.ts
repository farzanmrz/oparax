const PST = "America/Los_Angeles";

const stampFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: PST,
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: PST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** "MM/DD HH:MM:SS" in PST. */
export function pstStamp(iso: string): string {
  const p = Object.fromEntries(stampFmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  // hour12:false can yield "24" at midnight in some runtimes; normalize to "00".
  const hour = p.hour === "24" ? "00" : p.hour;
  return `${p.month}/${p.day} ${hour}:${p.minute}:${p.second}`;
}

/** PST calendar day as YYYY-MM-DD (for time-series bucketing). */
export function pstDay(iso: string): string {
  return dayFmt.format(new Date(iso)); // en-CA yields YYYY-MM-DD
}

/** Compact USD for per-call costs: cents+ to 4dp, sub-cent to 6dp, sign-aware. */
export function usd(n: number): string {
  if (n === 0) return "$0.00";
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a < 0.01) return `${sign}$${a.toFixed(6)}`;
  return `${sign}$${a.toFixed(4)}`;
}

/** Plain 2-decimal USD for dollar amounts (balances, limits, larger totals). */
export function usd2(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

/** 1234 -> "1.2k". */
export function compactTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}
