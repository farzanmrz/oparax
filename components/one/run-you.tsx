import { Quote } from "lucide-react";
import { BrandIcon } from "@/components/brand-icon";
import { ProfileAvatar } from "@/components/monitor/agent-header";
import { lift, liftHigh } from "@/components/one/stage";
import { monitorContent } from "@/lib/monitor/content";
import type { Onboarding, OnboardingPost } from "@/lib/onboarding/read";
import { cn } from "@/lib/utils";

// The run's right column, once the profile checkpoint exists (design preview v2/one/onboarding.tsx You): one identity
// block (the picture, the name beside it and the handle under it, About with the Twitter bio, the typed sentence, then
// the written brief once the answer exists), then the newest posts once they are saved.

const copy = monitorContent.onboarding;
const day = (iso: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(iso),
  );

export function RunYou({
  profile,
  beat,
  brief,
  posts,
}: {
  profile: NonNullable<Onboarding["profile"]>;
  beat: string;
  brief: Onboarding["brief"];
  posts: Onboarding["posts"];
}) {
  return (
    <aside aria-label={copy.you} className="grid min-w-0 gap-5">
      <section className={cn(liftHigh, "p-4")}>
        <div className="flex items-center gap-3">
          <ProfileAvatar
            profile={{ name: profile.name, bio: profile.bio, image: profile.image, site: null }}
          />
          <div className="min-w-0">
            <p className="truncate text-[15px] leading-tight font-semibold text-t1">
              {profile.name}
            </p>
            <p className="mt-0.5 truncate text-[13px] leading-tight text-t3">
              @{profile.handle.replace(/^@/, "")}
            </p>
          </div>
        </div>
        {profile.bio ? (
          <div className="mt-4">
            <p className="text-[13px] font-semibold text-t1">{copy.about}</p>
            <p className="mt-1.5 text-[13px] leading-[1.5] text-t2">{profile.bio}</p>
          </div>
        ) : null}
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-[13px] font-semibold text-t1">{copy.sentence}</p>
          <p className="mt-2 flex gap-2 text-[13px] leading-[1.45] font-medium text-t1">
            <Quote className="mt-0.5 size-3.5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            {beat}
          </p>
        </div>
        {brief ? (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-[13px] font-semibold text-t1">{copy.brief}</p>
            <p className="mt-1.5 text-[13px] leading-[1.55] text-t2">{brief.summary}</p>
            {brief.interests.length ? (
              <div className="mt-3 text-[12.5px]">
                <p className="mb-1.5 text-t3">{copy.interests}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {brief.interests.map((topic) => (
                    <li
                      key={topic}
                      className="rounded-full border border-[var(--brand-line)] bg-[var(--brand-soft)] px-2 py-0.5 text-[11.5px] text-t1"
                    >
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {brief.languages.length ? (
              <p className="mt-3 text-[12.5px] text-t3">
                {copy.language} <span className="ml-1 text-t1">{brief.languages.join(", ")}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      {posts?.length ? (
        <section aria-label={copy.posts}>
          <h2 className="mb-2.5 text-[13px] font-semibold text-t1">{copy.posts}</h2>
          <ul className="grid gap-2.5">
            {posts.map((post) => (
              <li key={post.id} className={cn(lift, "p-3")}>
                <PostBody post={post} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}

function PostBody({ post }: { post: OnboardingPost }) {
  return (
    <>
      <span className="flex items-center gap-1.5 text-[11.5px] text-t3">
        <BrandIcon name="x" className="size-2.5 text-[var(--kind-post)]" />
        {post.kind === "quote"
          ? copy.quote
          : post.kind === "thread"
            ? copy.thread(post.parts)
            : copy.post}
        <span className="ml-auto tabular-nums">{day(post.date)}</span>
      </span>
      <span className="mt-1.5 line-clamp-6 block text-[13px] leading-[1.5] whitespace-pre-line text-t1">
        {post.text}
      </span>
      {post.quoted ? (
        <span className="mt-2 line-clamp-4 block rounded-md border border-line bg-well px-2.5 py-1.5 text-[12px] leading-[1.45] text-t2">
          <span className="font-medium text-[var(--kind-post)]">{post.quoted.author}</span>{" "}
          {post.quoted.text}
        </span>
      ) : null}
    </>
  );
}
