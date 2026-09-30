import { Globe } from "lucide-react";
import Image from "next/image";
import { BrandIcon } from "@/components/brand-icon";
import { landingExample } from "@/lib/landing/example";

const cardClassName =
  "rounded-xl border bg-card p-3 text-sm shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]";

export function SourceStack() {
  const example = landingExample;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <article data-scene-node="post" className={cardClassName}>
        <header className="flex items-center gap-2">
          <Image
            src={example.post.avatar}
            alt=""
            width={36}
            height={36}
            className="size-9 rounded-full"
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium">{example.post.author}</p>
            <p className="text-muted-foreground">{example.post.handle}</p>
          </div>
          <BrandIcon name="x" mono className="size-4" />
        </header>
        <p className="mt-3 leading-relaxed">
          <span aria-hidden="true">… </span>
          {example.post.excerpt.split(/(@\w+)/).map((part) =>
            part.startsWith("@") ? (
              <span key={part} className="text-primary">
                {part}
              </span>
            ) : (
              part
            ),
          )}
          <span aria-hidden="true"> …</span>
        </p>
        <time dateTime={example.dateISO} className="mt-2 block text-xs text-muted-foreground">
          {example.date}
        </time>
      </article>
      <article data-scene-node="release" className={cardClassName}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe aria-hidden="true" className="size-4" />
          <span>{example.release.publisher}</span>
          <time dateTime={example.dateISO} className="ml-auto">
            {example.date}
          </time>
        </div>
        <h3 className="mt-2 line-clamp-2 font-medium leading-snug">{example.release.headline}</h3>
      </article>
      <article data-scene-node="update" className={cardClassName}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Globe aria-hidden="true" className="size-4" />
          <span>{example.update.publisher}</span>
          <time dateTime={example.dateISO} className="ml-auto">
            {example.date}
          </time>
        </div>
        <h3 className="mt-2 line-clamp-2 font-medium leading-snug">{example.update.headline}</h3>
      </article>
    </div>
  );
}
