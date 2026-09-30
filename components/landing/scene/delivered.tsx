import { ArrowLeft, Globe, Info, Send } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { OparaxMark } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { landingContent } from "@/lib/landing/content";
import { landingExample } from "@/lib/landing/example";

export function Delivered() {
  const example = landingExample;
  const dm = landingContent.scene.dm;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <article data-scene-node="story" className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <OparaxMark className="size-5 text-foreground" />
          <time dateTime={example.dateISO}>{example.date}</time>
        </div>
        <h3 className="mt-3 text-lg font-semibold leading-snug">{example.story.title}</h3>
        <p className="mt-3 text-sm leading-relaxed">
          {example.story.firstFact}{" "}
          <span className="text-primary">{example.story.releaseCitation}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-3 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
            <Globe aria-hidden="true" className="size-3" />
            {example.story.sources[0]}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
            <BrandIcon name="x" mono className="size-3" />
            {example.story.sources[1]}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1">
            <Globe aria-hidden="true" className="size-3" />
            {example.story.sources[2]}
          </span>
        </div>
      </article>
      <section
        data-scene-node="message"
        aria-label={dm.conversationLabel}
        className="overflow-hidden rounded-xl border bg-card"
      >
        <div className="flex items-center gap-2 border-b p-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            aria-label={dm.back}
            className="size-8 disabled:opacity-100"
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-background">
            <OparaxMark className="size-4" />
          </span>
          <div className="min-w-0 flex-1 text-xs">
            <p className="font-medium">{example.message.sender}</p>
            <p className="text-muted-foreground">{example.message.handle}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            aria-label={dm.info}
            className="size-8 disabled:opacity-100"
          >
            <Info aria-hidden="true" />
          </Button>
          <BrandIcon name="x" mono className="size-4" />
        </div>
        <div className="p-3">
          <time
            dateTime={example.dateISO}
            className="block text-center text-xs text-muted-foreground"
          >
            {example.date}
          </time>
          <div className="mt-3 max-w-[95%] rounded-2xl rounded-tl-sm bg-accent p-3 text-sm">
            <p className="whitespace-pre-line">
              {`${example.message.intro}\n\n${example.story.title}\n${example.story.firstFact}\n`}
              <span className="text-primary">{example.message.url}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 border-t p-2">
          <Input
            disabled
            placeholder={dm.composer}
            aria-label={dm.composerLabel}
            className="min-w-0 disabled:opacity-100"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled
            aria-label={dm.send}
            className="size-8 disabled:opacity-100"
          >
            <Send aria-hidden="true" />
          </Button>
        </div>
      </section>
    </div>
  );
}
