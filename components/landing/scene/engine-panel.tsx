import { Check, Combine, Link2, Target } from "lucide-react";
import { OparaxMark } from "@/components/logo";
import { landingContent } from "@/lib/landing/content";

const decisionIcons = [Target, Combine, Link2] as const;

export function EnginePanel() {
  const copy = landingContent.scene;
  return (
    <div data-scene-node="engine" className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <OparaxMark className="size-5" />
        <div>
          <p className="font-medium">{copy.engine}</p>
          <p className="text-xs text-muted-foreground">{copy.fromReports}</p>
        </div>
      </div>
      <div className="mt-5 rounded-lg bg-accent p-3">
        <p className="text-xs text-muted-foreground">{copy.interestLabel}</p>
        <p className="mt-1 text-sm">{copy.interest}</p>
      </div>
      <ol className="mt-5 flex flex-col gap-4">
        {copy.decisions.map((decision, index) => {
          const Icon = decisionIcons[index];
          return (
            <li key={decision.title} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent">
                <Icon aria-hidden="true" className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{decision.title}</p>
                <p className="text-xs text-muted-foreground">{decision.detail}</p>
              </div>
              <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />
            </li>
          );
        })}
      </ol>
      <p className="mt-5 flex items-center gap-2 border-t pt-3 text-sm font-medium">
        <Check aria-hidden="true" className="size-4 text-primary" />
        {copy.result}
      </p>
    </div>
  );
}
