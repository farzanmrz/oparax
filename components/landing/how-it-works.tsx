import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { landingContent } from "@/lib/landing/content";

export function HowItWorks() {
  const copy = landingContent.howItWorks;
  return (
    <section aria-labelledby="how-it-works-title" className="space-y-6">
      <h2 id="how-it-works-title" className="font-heading text-2xl font-bold">
        {copy.title}
      </h2>
      <ol className="grid gap-4 desk:grid-cols-3">
        {copy.steps.map((step) => (
          <li key={step.number}>
            <Card className="h-full shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_1px_-0.5px_rgba(0,0,0,0.06),0px_3px_3px_-1.5px_rgba(0,0,0,0.06),_0px_6px_6px_-3px_rgba(0,0,0,0.06),0px_12px_12px_-6px_rgba(0,0,0,0.06),0px_24px_24px_-12px_rgba(0,0,0,0.06)]">
              <CardHeader>
                <h3 className="font-heading text-xl font-bold">
                  <span
                    className="mr-2 font-mono text-base text-muted-foreground"
                    aria-hidden="true"
                  >
                    {step.number}
                  </span>
                  {step.title}
                </h3>
              </CardHeader>
              <CardContent className="text-base text-muted-foreground">
                {step.description}
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
    </section>
  );
}
