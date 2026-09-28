import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { landingContent } from "@/lib/landing/content";

export function Pricing() {
  const copy = landingContent.pricing;
  return (
    <section aria-labelledby="pricing-title" className="space-y-6">
      <h2 id="pricing-title" className="font-heading text-2xl font-bold">
        {copy.title}
      </h2>
      <p className="text-base text-muted-foreground">{copy.trial}</p>
      <div className="grid gap-4 desk:grid-cols-3">
        {copy.tiers.map((tier) => (
          <Card
            key={tier.name}
            className="shadow-[0px_0px_0px_1px_rgba(0,0,0,0.06),0px_1px_1px_-0.5px_rgba(0,0,0,0.06),0px_3px_3px_-1.5px_rgba(0,0,0,0.06),_0px_6px_6px_-3px_rgba(0,0,0,0.06),0px_12px_12px_-6px_rgba(0,0,0,0.06),0px_24px_24px_-12px_rgba(0,0,0,0.06)]"
          >
            <CardHeader>
              <h3 className="font-heading text-xl font-bold">{tier.name}</h3>
            </CardHeader>
            <CardContent className="flex-1 space-y-3 text-base">
              <p>
                <span className="font-mono text-3xl">{tier.price}</span>{" "}
                <span className="text-muted-foreground">{copy.period}</span>
              </p>
              <p>{tier.pool}</p>
              <p>{tier.cadence}</p>
              <p className="text-muted-foreground">{copy.unlimited}</p>
            </CardContent>
            <CardFooter>
              <Button asChild className="h-11 w-full desk:h-9">
                <a href="#build-agent">{copy.cta}</a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}
