import { ChevronRight } from "lucide-react";
import { monitorContent as copy, safeWebUrl } from "@/lib/monitor/content";
import type { DisplayItem } from "@/lib/monitor/read";

/** The items the agent read and left out, behind one quiet disclosure under the cards. */
export function SkippedList({ items }: { items: DisplayItem[] }) {
  if (!items.length) return null;
  return (
    <details className="group">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm text-[13px] text-t2 transition-colors hover:text-t1 focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-3.5 text-t3 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        {copy.skipped}
        <span className="text-t3 tabular-nums">{items.length}</span>
      </summary>
      <ul className="mt-3 grid gap-1.5 pl-5">
        {items.map(({ item }) => {
          const href = safeWebUrl(item.url);
          const title = item.title || copy.original;
          return (
            <li key={item.id} className="text-[13px] leading-[1.5]">
              {href ? (
                <a href={href} className="text-t2 underline-offset-4 hover:text-t1 hover:underline">
                  {title}
                </a>
              ) : (
                <span className="text-t2">{title}</span>
              )}
              {item.publisher ? <span className="ml-2 text-t3">{item.publisher}</span> : null}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
