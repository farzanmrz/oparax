"use client";

// app/agents/[id]/voice/verify-gate.tsx
//
// State 1 of the Voice tab (page.tsx's Part A): `experiments.reporter_verified_at` is null,
// so `voice_guides_verified_gate`'s RLS policy hides an existing guide from this desk either
// way — this card replaces the guide area entirely rather than guessing which empty state to
// show. Two real paths: "Verify with X" (pre-empts the not_linked error the same way
// PostToXControl pre-empts it — checked via `xLinked` before ever calling `verifyHandle`, so a
// stale/unlinked session between page load and click still surfaces the same copy through the
// action's own `not_linked` reason) and the owner-attest escape hatch, kept visually secondary
// (a text link, not a button) since its own doc comment says to use it sparingly.

import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attestHandle, verifyHandle } from "./actions";

export function VerifyGate({
  deskId,
  reporterHandle,
  xLinked,
}: {
  readonly deskId: string;
  readonly reporterHandle: string;
  readonly xLinked: boolean;
}) {
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, startVerifyTransition] = useTransition();
  const [isAttesting, startAttestTransition] = useTransition();

  function handleVerify() {
    setError(null);
    startVerifyTransition(async () => {
      const result = await verifyHandle(deskId);
      if (result.ok) return; // revalidated server-side — this gate resolves to state 2/3 on its own
      setError(
        result.reason === "handle_mismatch"
          ? "Your linked X account doesn't match this desk's reporter handle."
          : result.reason === "not_linked"
            ? "Your X account is no longer linked. Reconnect it to verify."
            : "That desk could not be found. Please try again.",
      );
    });
  }

  function handleAttest() {
    setError(null);
    startAttestTransition(async () => {
      const result = await attestHandle(deskId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verify to see your writing guide</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="max-w-md text-sm text-muted-foreground text-pretty">
          Confirm @{reporterHandle} is really the reporter behind this desk before Oparax shows
          their writing guide.
        </p>
        <div className="flex flex-col items-start gap-2">
          {xLinked ? (
            <Button disabled={isVerifying} onClick={handleVerify}>
              {isVerifying ? "Verifying…" : "Verify with X"}
            </Button>
          ) : (
            <Button asChild>
              {/* Plain link, not a fetch: /auth/x is a full-page OAuth redirect to X — same
                  shape as PostToXControl's Connect-X affordance. */}
              <a href={`/auth/x?returnTo=${encodeURIComponent(pathname)}`}>Connect X to verify</a>
            </Button>
          )}
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            className="h-auto p-0 text-muted-foreground"
            disabled={isAttesting}
            onClick={handleAttest}
            variant="link"
          >
            {isAttesting ? "Vouching…" : "I'll vouch for this handle myself"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
