import Link from "next/link";
import { CircleCheck, Clock, Info } from "lucide-react";
import { Page, readParams, type SearchParams } from "@/next/frame";
import { Button } from "@/components/ui/button";
import { checkout } from "@/next/copy";

const states = {
  confirmed: { icon: CircleCheck, text: checkout.confirmed, again: true },
  pending: { icon: Clock, text: checkout.pending, again: true },
  unpaid: { icon: Info, text: checkout.unpaid, again: true },
  unavailable: { icon: Info, text: checkout.unavailable, again: false },
} as const;

// Checkout return (app/checkout/return/page.tsx): one status line and the two real actions.
export default async function CheckoutReturnPage({ searchParams }: { searchParams: SearchParams }) {
  const param = await readParams(searchParams);
  const key = param("state");
  const state = states[key === "pending" || key === "unpaid" || key === "unavailable" ? key : "confirmed"];
  const Icon = state.icon;
  return (
    <Page header="member" className="flex items-center justify-center bg-muted px-4 py-20">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-7">
        <h1 className="text-xl font-semibold tracking-tight">{checkout.title}</h1>
        <p role="status" className="mt-4 flex gap-3 text-sm leading-relaxed">
          <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          {state.text}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild variant="outline" className="h-10 w-full text-sm">
            <Link href="/next/feed/page">{checkout.open}</Link>
          </Button>
          {state.again ? (
            <Button variant="outline" className="h-10 w-full text-sm">
              {checkout.again}
            </Button>
          ) : null}
        </div>
      </div>
    </Page>
  );
}
