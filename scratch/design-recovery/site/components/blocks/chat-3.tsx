"use client";

import { useState } from "react";
import { Heart, MessageCircle, Repeat2, Share2, Sparkles } from "lucide-react";

const cx = (...c: (string | false | null | undefined)[]) =>
  c.filter(Boolean).join(" ");

const focus =
  "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--rb-accent,oklch(20.5%_0_0))] dark:focus-visible:outline-[var(--rb-accent,oklch(100%_0_0))]";

const transition =
  "transition-[background-color,border-color,color,opacity,transform] duration-150 ease-out";

const frame =
  "rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-neutral-50 p-1 dark:border-neutral-800 dark:bg-neutral-950";
const panel =
  "rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-white dark:border-neutral-800 dark:bg-neutral-900";

const POST = {
  author: "Amelia Whitfield",
  handle: "@amelia",
  initials: "AW",
  at: "2h",
  body: "We rebuilt our billing screens around one rule: colour marks the exception, never the layout. Overdue is the only thing that gets to be red.",
  stats: { replies: 24, reposts: 41, likes: 318 },
};

const REPLIES = [
  {
    id: "r1",
    author: "Marcus Bell",
    handle: "@marcusb",
    initials: "MB",
    at: "1h",
    body: "This is the part most dashboards get wrong. Six status colours and everything looks equally urgent.",
    likes: 42,
    liked: true,
    children: [
      {
        id: "r1a",
        author: "Amelia Whitfield",
        handle: "@amelia",
        initials: "AW",
        at: "58m",
        body: "Exactly. We capped ourselves at two hues for the whole surface and it forced better hierarchy everywhere else.",
        likes: 17,
        liked: false,
      },
    ],
  },
  {
    id: "r2",
    author: "Sofia Alvarez",
    handle: "@sofia.a",
    initials: "SA",
    at: "44m",
    body: "Curious how you handle the “nearing limit” case. That one always wants to be its own colour.",
    likes: 9,
    liked: false,
    children: [],
  },
];

function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
    >
      {initials}
    </span>
  );
}

function Action({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: typeof Heart;
  label: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${label}, ${count}`}
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-[var(--rb-r-sm,6px)] px-1.5 text-[12px] tabular-nums",
        transition,
        focus,
        active
          ? "text-neutral-900 dark:text-neutral-100"
          : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
      )}
    >
      <Icon
        className={cx("h-3.5 w-3.5", active && "fill-current")}
        aria-hidden
      />
      {count}
    </button>
  );
}

export default function Chat3() {
  const [liked, setLiked] = useState(false);
  const [draft, setDraft] = useState("");

  return (
    <div className="flex h-full min-h-[800px] w-full flex-col overflow-y-auto bg-white p-4 sm:p-6 dark:bg-neutral-950">
      <div className={cx(frame, "mx-auto w-full max-w-[680px] space-y-1")}>
        <article className={cx(panel, "p-4")}>
          <div className="flex items-start gap-3">
            <Avatar initials={POST.initials} size={40} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[14px] font-medium text-neutral-900 dark:text-neutral-100">
                  {POST.author}
                </span>
                <span className="text-[12px] text-neutral-500">
                  {POST.handle} · {POST.at}
                </span>
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-neutral-800 dark:text-neutral-200">
                {POST.body}
              </p>
              <div className="mt-3 flex items-center gap-1">
                <Action
                  icon={MessageCircle}
                  label="Replies"
                  count={POST.stats.replies}
                />
                <Action
                  icon={Repeat2}
                  label="Reposts"
                  count={POST.stats.reposts}
                />
                <Action
                  icon={Heart}
                  label="Likes"
                  count={POST.stats.likes + (liked ? 1 : 0)}
                  active={liked}
                  onClick={() => setLiked((v) => !v)}
                />
                <button
                  type="button"
                  aria-label="Share post"
                  className={cx(
                    "ml-auto inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[var(--rb-r-sm,6px)] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
                    transition,
                    focus,
                  )}
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </article>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setDraft("");
          }}
          className={cx(panel, "flex items-start gap-3 p-3")}
        >
          <Avatar initials="YO" />
          <div className="min-w-0 flex-1">
            <label htmlFor="chat-3-reply" className="sr-only">
              Post a reply
            </label>
            <textarea
              id="chat-3-reply"
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Post your reply"
              className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-neutral-900 placeholder:text-neutral-400 focus:outline-none dark:text-neutral-100"
            />
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="text-[12px] text-neutral-400">
                Replies are visible to everyone following this thread.
              </p>
              <button
                type="submit"
                disabled={!draft.trim()}
                className={cx(
                  "inline-flex h-8 shrink-0 items-center rounded-[var(--rb-r-md,8px)] bg-[var(--rb-accent,oklch(20.5%_0_0))] px-3 text-[13px] font-medium text-[var(--rb-accent-fg,oklch(100%_0_0))] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[var(--rb-accent,oklch(100%_0_0))] dark:text-[var(--rb-accent-fg,oklch(20.5%_0_0))]",
                  draft.trim() &&
                    "cursor-pointer hover:bg-neutral-800 active:scale-[0.98] dark:hover:bg-neutral-200",
                  transition,
                  focus,
                )}
              >
                Reply
              </button>
            </div>
          </div>
        </form>

        <div className={cx(panel, "flex items-center gap-2 px-4 py-2.5")}>
          <Sparkles className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <p className="text-[12px] text-neutral-500">
            Showing most relevant replies first
          </p>
          <button
            type="button"
            className={cx(
              "ml-auto inline-flex h-7 cursor-pointer items-center rounded-[var(--rb-r-sm,6px)] px-2 text-[12px] font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
              transition,
              focus,
            )}
          >
            Most recent
          </button>
        </div>

        {REPLIES.map((r) => (
          <article key={r.id} className={cx(panel, "p-4")}>
            <div className="flex items-start gap-3">
              <Avatar initials={r.initials} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                    {r.author}
                  </span>
                  <span className="text-[12px] text-neutral-500">
                    {r.handle} · {r.at}
                  </span>
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {r.body}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <Action
                    icon={Heart}
                    label={`Likes on reply from ${r.author}`}
                    count={r.likes}
                    active={r.liked}
                  />
                  <button
                    type="button"
                    className={cx(
                      "inline-flex h-7 cursor-pointer items-center rounded-[var(--rb-r-sm,6px)] px-1.5 text-[12px] text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
                      transition,
                      focus,
                    )}
                  >
                    Reply
                  </button>
                </div>

                {r.children.length > 0 && (
                  <ul className="mt-3 space-y-3 border-l border-neutral-200 pl-4 dark:border-neutral-800">
                    {r.children.map((c) => (
                      <li key={c.id} className="flex items-start gap-2.5">
                        <Avatar initials={c.initials} size={26} />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100">
                              {c.author}
                            </span>
                            <span className="text-[12px] text-neutral-500">
                              {c.handle} · {c.at}
                            </span>
                          </p>
                          <p className="mt-1 text-[13px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                            {c.body}
                          </p>
                          <div className="mt-1.5">
                            <Action
                              icon={Heart}
                              label={`Likes on reply from ${c.author}`}
                              count={c.likes}
                              active={c.liked}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </article>
        ))}

        <button
          type="button"
          className={cx(
            panel,
            "flex h-11 w-full cursor-pointer items-center justify-center text-[13px] font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-100",
            transition,
            focus,
          )}
        >
          Show 21 more replies
        </button>
      </div>
    </div>
  );
}
