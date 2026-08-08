// Writer-side shape persisted to the extraction ledger for audit provenance. The setup UI does
// not transport or render this content; it reads only the human pipeline step statuses.
export type ExtractionReasoningStage = "scope" | "extract";
export type ExtractionReasoningByStage = Partial<Record<ExtractionReasoningStage, string>>;
export type ExtractionTextByStage = Partial<Record<ExtractionReasoningStage, string>>;
type ExtractionToolActivityState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";
export type ExtractionToolActivity = {
  id: string;
  toolName: string;
  stage: ExtractionReasoningStage;
  state: ExtractionToolActivityState;
  inputText: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};
export type ExtractionStreamProgress = {
  reasoningByStage: ExtractionReasoningByStage;
  textByStage: ExtractionTextByStage;
  toolActivities: ExtractionToolActivity[];
};

const SERIALIZED_PREFIX = "oparax-progress-v2:";

export function serializeExtractionProgress(value: ExtractionStreamProgress): string {
  return `${SERIALIZED_PREFIX}${JSON.stringify(value)}`;
}
