export const typographyCandidates = [
  { id: "source", label: "1. Source Sans 3", heading: "Source Sans 3", body: "Source Sans 3" },
  { id: "manrope", label: "2. Manrope + Source Sans 3", heading: "Manrope", body: "Source Sans 3" },
  {
    id: "nunito",
    label: "3. Nunito Sans + Source Sans 3",
    heading: "Nunito Sans",
    body: "Source Sans 3",
  },
  { id: "open", label: "4. Open Sans", heading: "Open Sans", body: "Open Sans" },
] as const;

export type TypographyChoice = (typeof typographyCandidates)[number]["id"] | "direction";

export function typographyChoice(value: string | null | undefined): TypographyChoice {
  return typographyCandidates.find((candidate) => candidate.id === value)?.id ?? "direction";
}
