import { Check, Globe, Layers } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { LandingCta } from "@/components/landing/landing-cta";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { landingContent } from "@/lib/landing/content";

export function Pricing() {
  const copy = landingContent.pricing;
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className="flex scroll-mt-28 flex-col gap-6 desk:scroll-mt-16"
    >
      <div className="flex flex-col gap-2">
        <h2 id="pricing-title" className="font-heading text-2xl font-semibold">
          {copy.title}
        </h2>
        <p className="max-w-3xl text-muted-foreground">{copy.intro}</p>
      </div>
      <div className="max-w-full overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-[740px] table-fixed">
          <TableCaption className="sr-only">{copy.comparison}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-[220px] align-top">
                <span className="sr-only">{copy.comparison}</span>
              </TableHead>
              {copy.tiers.map((tier) => (
                <TableHead
                  key={tier.name}
                  scope="col"
                  className="min-w-[170px] whitespace-normal p-4 align-top"
                >
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <p className="mt-2">
                    <span className="text-2xl font-semibold">{tier.price}</span>{" "}
                    <span className="text-sm text-muted-foreground">{copy.period}</span>
                  </p>
                  <div className="mt-3">
                    <LandingCta cta="sign_up" placement="pricing" />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableHead scope="row" className="whitespace-normal p-4">
                <span className="flex items-center gap-2">
                  <BrandIcon name="x" mono className="size-4" />
                  {copy.rows.posts}
                </span>
              </TableHead>
              {copy.tiers.map((tier) => (
                <TableCell key={tier.name} className="p-4 text-sm tabular-nums">
                  {tier.postsPerMonth}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableHead scope="row" className="whitespace-normal p-4">
                <span className="flex items-center gap-2">
                  <BrandIcon name="x" mono className="size-4" />
                  {copy.rows.alerts}
                </span>
              </TableHead>
              {copy.tiers.map((tier) => (
                <TableCell key={tier.name} className="whitespace-normal p-4 text-sm">
                  {tier.alertCadence}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableHead scope="row" className="whitespace-normal p-4">
                <span className="flex items-center gap-2">
                  <Globe aria-hidden="true" className="size-4" />
                  {copy.rows.sites}
                </span>
              </TableHead>
              {copy.tiers.map((tier) => (
                <TableCell key={tier.name} className="p-4 text-sm">
                  {copy.rows.unlimited}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableHead scope="row" className="whitespace-normal p-4">
                <span className="flex items-center gap-2">
                  <Layers aria-hidden="true" className="size-4" />
                  {copy.rows.stories}
                </span>
              </TableHead>
              {copy.tiers.map((tier) => (
                <TableCell key={tier.name} className="p-4">
                  <Check aria-label={copy.rows.included} className="size-4 text-primary" />
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableHead scope="row" className="whitespace-normal p-4">
                <span className="flex items-center gap-2">
                  <BrandIcon name="github" mono className="size-4" />
                  {copy.rows.github}
                </span>
              </TableHead>
              {copy.tiers.map((tier) => (
                <TableCell key={tier.name} className="p-4">
                  <span className="flex items-center gap-2">
                    <Check aria-label={copy.rows.included} className="size-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{copy.rows.optionalDaily}</span>
                  </span>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableHead scope="row" className="whitespace-normal p-4">
                <span className="flex items-center gap-2">
                  <BrandIcon name="producthunt" className="size-4" />
                  {copy.rows.productHunt}
                </span>
              </TableHead>
              {copy.tiers.map((tier) => (
                <TableCell key={tier.name} className="p-4">
                  <span className="flex items-center gap-2">
                    <Check aria-label={copy.rows.included} className="size-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{copy.rows.optionalDaily}</span>
                  </span>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">{copy.note}</p>
    </section>
  );
}
