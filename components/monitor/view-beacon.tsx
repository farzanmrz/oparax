"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function ViewBeacon({ monitorId }: { monitorId: string }) {
  const sent = useRef<string | null>(null);
  const router = useRouter();
  useEffect(() => {
    if (sent.current === monitorId) return;
    sent.current = monitorId;
    void fetch("/api/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monitorId }),
      keepalive: true,
    })
      .then((response) => {
        if (response.ok) router.refresh();
      })
      .catch(() => {
        /* A failed beacon must leave the public page readable. */
      });
  }, [monitorId, router]);
  return null;
}
