"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { monitorContent as copy } from "@/lib/monitor/content";
import { normalizeValidHandle } from "@/lib/x/handle";

export function RefreshWhileBuilding({ building }: { building: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!building) return;
    const timer = setInterval(() => router.refresh(), 3_000);
    return () => clearInterval(timer);
  }, [building, router]);
  return null;
}

export function MissingAgentHeading() {
  const params = useParams<{ handle?: string; story?: string }>();
  const handle = params.handle ? normalizeValidHandle(params.handle) : null;
  return (
    <h1 className="font-heading text-3xl font-normal">
      {handle && !params.story ? copy.missing(handle) : copy.missingStory}
    </h1>
  );
}
