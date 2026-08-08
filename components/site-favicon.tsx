"use client";

import { GlobeIcon } from "lucide-react";
import { useState } from "react";

function hostnameOf(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function SiteFavicon({ domain, url }: { domain?: string | null; url?: string | null }) {
  const [failedHost, setFailedHost] = useState<string | null>(null);
  const host = domain ?? hostnameOf(url);
  const failed = host !== null && failedHost === host;

  return (
    <span className="flex size-[15px] shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-white/85">
      {host && !failed ? (
        // biome-ignore lint/performance/noImgElement: tiny third-party favicons should not use the image optimizer
        <img
          alt=""
          aria-hidden="true"
          className="size-[11px]"
          onError={() => setFailedHost(host)}
          referrerPolicy="no-referrer"
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`}
        />
      ) : (
        <GlobeIcon aria-hidden="true" className="size-[11px] text-neutral-600" />
      )}
    </span>
  );
}
