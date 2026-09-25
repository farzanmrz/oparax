export function deriveUsernameFromEmail(email: string | null | undefined): string {
  const local = (email ?? "").split("@")[0]?.trim() ?? "";
  return local || "reporter";
}
