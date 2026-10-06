import { Alert, AlertDescription } from "@/components/ui/alert";
import { previewNotice } from "@/lib/local-preview/fixture";
import { cn } from "@/lib/utils";

/** The line every development preview page carries, so its example data never reads as live. */
export function PreviewNotice({ className }: { className?: string }) {
  return (
    <Alert className={cn("mb-6", className)}>
      <AlertDescription>{previewNotice}</AlertDescription>
    </Alert>
  );
}
