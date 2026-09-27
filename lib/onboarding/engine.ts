import "server-only";
import { generateText, ToolLoopAgent, tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import seedTable from "@/docs/source-table-seed.json";
import { checkSource, readPage } from "./checker";
import { INSTRUCTIONS_TEMPLATE, WRITER_TEMPLATE } from "./prompts";
import type { Final, OnboardingUIMessage } from "./types";

// Onboarding as one AI SDK ToolLoopAgent on GPT-6 Luna fast, ported from the lab harness
// (scratch/onboarding-loop/run.ts). Code owns every tool. The lab's web search tool is left out: the
// gateway runs it server-side, so its search cap could not be enforced (council, September 27); the
// model proposes streams it knows and code checks them.

// Full-archive search allows one request per second, so every X call from this server waits its turn.
const X_GAP_MS = 1100;
let xQueue: Promise<unknown> = Promise.resolve();
let xLast = 0;
function xTurn<T>(work: () => Promise<T>): Promise<T> {
  const next = xQueue.then(async () => {
    const wait = xLast + X_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    xLast = Date.now();
    return work();
  });
  xQueue = next.catch(() => {});
  return next;
}

export async function runOnboarding(
  { handle, beat }: { handle: string; beat: string },
  writer: UIMessageStreamWriter<OnboardingUIMessage>,
): Promise<void> {
  const MODEL = "openai/gpt-6-luna-fast";
  const REASONING = "high" as const;
  const X = process.env.X_BEARER_TOKEN ?? "";
  const GW = process.env.AI_GATEWAY_API_KEY ?? "";
  type Part = {
    id: string;
    date: string;
    text: string;
    quoted?: Quoted | null;
    links?: string[];
    link_meta?: Record<string, LinkMeta>;
    media?: { type: string; alt?: string }[];
  };
  type Quoted = { id: string; author: string; name: string; text: string };
  type LinkMeta = { title?: string; description?: string };
  // One unit the model reads. A thread is one Post whose parts are the person's own self-reply chain, in order.
  type Post = {
    id: string;
    date: string;
    kind: "original" | "quote" | "thread" | "thread_part";
    lang?: string;
    text: string;
    parts?: Part[];
    quoted: Quoted | null;
    quoted_account: string | null;
    parent_id?: string;
    links: string[];
    link_meta: Record<string, LinkMeta>;
    mentions: string[];
    hashtags: string[];
    cashtags: string[];
    media: { type: string; alt?: string }[];
    poll?: string[];
    sponsored?: boolean;
    likes?: number;
    conversation_id?: string;
    reply_count?: number;
    thread_len?: number;
    thread_ids?: string[];
    edit_ids?: string[];
    raw?: unknown;
  };
  type Row = {
    id: string;
    kind: string;
    target: string;
    name: string;
    focus: string;
    lang: string;
    description: string;
  };
  // A ranked row: its overall score and band, the direction it was picked for (if any) with that score, and the evidence line.
  type Pick = Row & {
    score: number | null;
    band: string;
    evidence: string;
    direction?: string;
    direction_score?: number;
  };
  type Direction = {
    label: string;
    concept: string;
    vocabulary: string[];
    post_ids: string[];
    status: string;
  };
  const TABLE = seedTable as Row[];

  // Caps. Owner, September 25: 3 levels, 10 searches, about 100 posts (a thread counts as one), 20 picks,
  // at least 10 accounts. Assistant numbers, not yet ruled: 5 links read, 10 checks, submit forced at turn 20,
  // 10 seed pages. Thread completion is one request per search, so it needs no limit of its own.
  const CAPS = {
    levels: 3,
    searches: 10,
    posts: 100,
    links: 5,
    checks: 10,
    picks: 20,
    accounts: 10,
  };
  // Every other number a model reads. The prompt and the tool descriptions take them from here (fillCaps), and
  // check-prompts.py fails on any digit that is not one of these, so a sentence can never go stale again.
  const SEED_UNITS = 20,
    SEED_PAGES = 10; // the seed: 20 units; at most 10 timeline pages (assistant number, owner kept it September 26)
  const SEED_VERSION = 4; // bump whenever seed logic changes, so a same-day cache is not reused
  const PDF_PAGES = 10; // owner, September 26: a PDF is read up to 10 pages
  const DIRECTIONS = { min: 2, max: 6 }; // a map has 2 to 6 directions
  const THIN_SEED = 5; // fewer on-beat seed posts than this is a thin profile
  const RECUR = 2; // a direction recurs when this many posts show it
  const WEB_SEARCHES = { min: 3, max: 5 }; // the one web search round
  const KEYWORD_CHARS = 900,
    KEYWORD_HARD = 960; // a query's keyword expression
  const SUBMIT_TURN = 20,
    MAX_TURNS = 22; // submit is forced at turn 20; the loop ends at 22
  const STRONG = 0.75,
    POSSIBLE = 0.35,
    FIT_LINE = 0.5; // Jev bands for rows (owner, September 21) and the fit line (owner, September 26)
  const FOCUS_WORDS = { min: 2, max: 6 },
    DESC_SENTENCES = { min: 3, max: 4 },
    DESC_CHARS = { min: 280, max: 480 }; // a table row
  const SUMMARY_SENTENCES = { min: 2, max: 4 },
    PHASES = 4;
  const REASON_SENTENCES = 1; // an account's reason is one sentence (assistant number, round 7)
  // One definition of covered for the prompt, the field and the check.
  const COVERED = 3;
  // Pick filling: a direction takes at most an even share of the page plus this many in the turns, and a
  // direction with fewer than GAP_STRONG_ROWS strong table rows is a table gap (round 5 review: Kush got 15 of
  // 20 picks for one broad direction, and Liam's video direction had one strong row, so no search ran).
  const PICK_CAP_EXTRA = 1,
    GAP_STRONG_ROWS = 2;
  // Every number a prompt may state, by placeholder. The prompt text and the tool descriptions use these, so
  // the sentence the model reads and the rule code enforces cannot disagree; the dump exposes them to check-prompts.py.
  const NUMBERS: Record<string, number> = {
    PICKS: CAPS.picks,
    ACCOUNTS: CAPS.accounts,
    COVERED,
    THIN: COVERED - 1,
    LEVELS: CAPS.levels,
    SEARCHES: CAPS.searches,
    POSTS: CAPS.posts,
    LINKS: CAPS.links,
    CHECKS: CAPS.checks,
    SEED_UNITS,
    SEED_PAGES,
    PDF_PAGES,
    DIR_MIN: DIRECTIONS.min,
    DIR_MAX: DIRECTIONS.max,
    THIN_SEED,
    RECUR,
    WEB_MIN: WEB_SEARCHES.min,
    WEB_MAX: WEB_SEARCHES.max,
    KEYWORD_CHARS,
    SUBMIT_TURN,
    FIT_LINE,
    STRONG,
    POSSIBLE,
    PICK_CAP_EXTRA,
    GAP_STRONG_ROWS,
    SUM_MIN: SUMMARY_SENTENCES.min,
    SUM_MAX: SUMMARY_SENTENCES.max,
    REASON_SENTENCES,
    PHASES,
    FOCUS_MIN: FOCUS_WORDS.min,
    FOCUS_MAX: FOCUS_WORDS.max,
    SENT_MIN: DESC_SENTENCES.min,
    SENT_MAX: DESC_SENTENCES.max,
    DESC_MIN: DESC_CHARS.min,
    DESC_MAX: DESC_CHARS.max,
  };
  // Every tag code wraps data in. The trust section lists them from here, and check-prompts.py fails on a tag
  // run.ts renders that this list leaves out, so the list cannot drift from what the model reads.
  const DATA_TAGS = [
    "beat",
    "profile",
    "bio",
    "pinned_post",
    "seed_posts",
    "post",
    "part",
    "text",
    "quoted",
    "link",
    "media",
    "poll",
    "search_result",
    "page",
    "picks",
    "row",
    "table_gaps",
    "table_accounts",
    "account",
    "their_accounts",
    "linked_sites",
    "checked",
    "item",
    "author",
  ] as const;
  type DataTag = (typeof DATA_TAGS)[number];
  // Every text fillCaps fills, by its rendered form, with the template it came from: the dump exports it so
  // check-prompts.py can require that each number a model reads comes from a placeholder naming its constant.
  const FILLED = new Map<string, string>();
  const fillCaps = (t: string) => {
    const out = Object.entries(NUMBERS)
      .reduce((acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)), t)
      .replaceAll(
        "{DATA_TAGS}",
        `${DATA_TAGS.slice(0, -1).join(", ")} and ${DATA_TAGS[DATA_TAGS.length - 1]}`,
      );
    FILLED.set(out, t);
    return out;
  };
  const X_POST = 0.005,
    X_USER = 0.01;
  // X bills a post or profile once per UTC day however often it is returned (cogs.md), so a re-returned
  // id costs nothing; every X call prices its answer through this.
  function xBill(body: any): number {
    let usd = 0;
    for (const t of [...(body?.data ?? []), ...(body?.includes?.tweets ?? [])])
      if (t?.id && !S.billed.has(`t${t.id}`)) {
        S.billed.add(`t${t.id}`);
        usd += X_POST;
      }
    for (const u of body?.includes?.users ?? [])
      if (u?.id && !S.billed.has(`u${u.id}`)) {
        S.billed.add(`u${u.id}`);
        usd += X_USER;
      }
    S.x_usd += usd;
    return usd;
  }
  const SOCIAL = [
    "x.com",
    "twitter.com",
    "t.co",
    "instagram.com",
    "facebook.com",
    "tiktok.com",
    "youtube.com",
    "youtu.be",
  ];

  type Checked = Awaited<ReturnType<typeof checkSource>>;
  // ---------- run state, owned by code; the model never edits it ----------
  const S = {
    phase: "map" as "map" | "read" | "rank" | "gaps" | "done",
    step: 0,
    posts: new Map<string, Post>(),
    seenIds: new Set<string>(),
    threadFetches: 0,
    searches: 0,
    level: 0,
    linksRead: 0,
    checks: 0,
    webSearched: false,
    map: null as null | {
      directions: {
        label: string;
        concept: string;
        vocabulary: string[];
        post_ids: string[];
        status: string;
      }[];
      off_beat_post_ids: string[];
      on_beat_count: number;
    },
    finish: null as null | Record<string, unknown>,
    rank: null as null | {
      picks: Pick[];
      scores: Record<string, number>;
      direction_scores: Record<string, Record<string, number>>;
      accounts: Pick[];
      table_gaps: string[];
    },
    accepted: new Map<string, Checked & { direction: string; fit: number }>(),
    rows: [] as Record<string, unknown>[],
    samePublisher: new Set<string>(), // accepted addresses write_row refused because their publisher already has an added row
    foundHandles: new Set<string>(),
    findAccountsRan: false,
    searchedL1: new Set<string>(),
    checkAttempts: 0,
    checkedKeys: new Set<string>(), // address and direction pairs already checked; a repeat is refused (Kush, Luna high)
    readUrls: new Set<string>(),
    offChain: 0,
    textless: 0,
    uid: "",
    submitted: null as null | Record<string, any>,
    billed: new Set<string>(),
    x_usd: 0,
    jev_usd: 0,
    writer_usd: 0,
    log: [] as {
      step: number;
      tool: string;
      input: unknown;
      seen: string;
      full: unknown;
      ms: number;
      x_usd?: number;
    }[],
  };

  function usd(n: number) {
    return Math.round(n * 100000) / 100000;
  }

  // A thread is one unit: the root plus every post that replies to the person's own previous post in
  // the chain, in order. A reply to anyone else is not part of it and is dropped (replies are excluded).
  const partOf = (p: Post): Part => ({
    id: p.id,
    date: p.date,
    text: p.text,
    quoted: p.quoted,
    links: p.links,
    link_meta: p.link_meta,
    media: p.media,
  });
  function mergeThread(root: Post, candidates: Post[]) {
    const existing: Part[] = root.parts ?? [partOf(root)];
    const chain = new Set(existing.map((pt) => pt.id));
    for (let grew = true; grew; ) {
      grew = false;
      for (const p of candidates)
        if (!chain.has(p.id) && p.parent_id && chain.has(p.parent_id)) {
          chain.add(p.id);
          grew = true;
        }
    }
    // A continuation whose parent is not in the chain is not part of this thread; it is counted, not shown.
    S.offChain += candidates.filter((p) => !chain.has(p.id)).length;
    const members = [
      ...new Map(
        candidates
          .filter((p) => chain.has(p.id) && !existing.some((pt) => pt.id === p.id))
          .map((p) => [p.id, p]),
      ).values(),
    ];
    if (!members.length) return;
    const parts = [...existing, ...members.map(partOf)].sort((a, b) =>
      BigInt(a.id) < BigInt(b.id) ? -1 : 1,
    );
    root.parts = parts;
    root.text = parts.map((pt) => pt.text).join("\n\n");
    root.links = [...new Set(parts.flatMap((pt) => pt.links ?? []))];
    for (const pt of parts) Object.assign(root.link_meta, pt.link_meta ?? {});
    root.mentions = [...new Set([...root.mentions, ...members.flatMap((p) => p.mentions)])];
    root.hashtags = [...new Set([...root.hashtags, ...members.flatMap((p) => p.hashtags)])];
    root.cashtags = [...new Set([...root.cashtags, ...members.flatMap((p) => p.cashtags)])];
    root.media = parts.flatMap((pt) => pt.media ?? []);
    root.kind = "thread";
    root.sponsored = Boolean(root.sponsored) || members.some((p) => p.sponsored);
    root.thread_ids = parts.map((pt) => pt.id);
    root.thread_len = parts.length;
  }
  // Groups a batch by conversation: a continuation joins its root when the root is in the batch or
  // already collected; a continuation whose root is unknown stands alone as a thread_part.
  function foldThreads(batch: Post[]): Post[] {
    const byId = new Map(batch.map((p) => [p.id, p]));
    const out: Post[] = [];
    const parts = new Map<string, Post[]>();
    for (const p of batch) {
      const rootId = p.conversation_id;
      if (
        p.kind === "thread_part" &&
        rootId &&
        rootId !== p.id &&
        (byId.has(rootId) || S.posts.has(rootId))
      ) {
        parts.set(rootId, [...(parts.get(rootId) ?? []), p]);
      } else out.push(p);
    }
    for (const [rootId, ps] of parts) mergeThread(byId.get(rootId) ?? S.posts.get(rootId)!, ps);
    return out;
  }
  // Completes the threads a search found (search drops replies, so continuations never arrive): one request
  // for all of that search's roots, asking only for the person's replies to themselves (to: their own
  // handle), so replies to other people are never fetched or paid for. A root with any reply qualifies,
  // since a two-part thread has exactly one. The seed needs none: the timeline already carries them.
  async function completeThreads(candidates: Post[]): Promise<number> {
    const roots = candidates.filter(
      (p) => !p.thread_len && p.conversation_id === p.id && (p.reply_count ?? 0) >= 1,
    );
    if (!roots.length) return 0;
    let spent = 0;
    S.threadFetches += 1;
    const query = `(${roots.map((p) => `conversation_id:${p.id}`).join(" OR ")}) from:${handle} to:${handle}`;
    const got: Post[] = [];
    let token: string | undefined;
    for (let page = 0; page < 5; page += 1) {
      const { status, body } = await xGet("tweets/search/all", {
        query,
        max_results: "100",
        start_time: yearAgo,
        ...POST_FIELDS,
        ...(token ? { next_token: token } : {}),
      });
      if (status !== 200) break;
      spent += xBill(body);
      got.push(...toPosts(body).posts.filter((q) => !S.seenIds.has(q.id)));
      token = body.meta?.next_token;
      if (!token) break;
    }
    for (const q of got) S.seenIds.add(q.id);
    for (const r of roots)
      mergeThread(
        r,
        got.filter((q) => q.conversation_id === r.id),
      );
    return spent;
  }
  // An edited post comes back under every version's id; every id of its edit history is remembered, so the
  // same post is never counted twice as evidence.
  function addPosts(batch: Post[]): Post[] {
    const fresh: Post[] = [];
    // Newest first, so when two versions of an edited post arrive together the later edit is the one kept.
    for (const p of [...batch].sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? 1 : -1))) {
      const ids = [p.id, ...(p.edit_ids ?? [])];
      if (ids.some((id) => S.seenIds.has(id))) continue;
      for (const id of ids) S.seenIds.add(id);
      fresh.push(p);
    }
    const units = foldThreads(fresh);
    for (const p of units) if (!S.posts.has(p.id)) S.posts.set(p.id, p);
    return units.filter((p) => S.posts.get(p.id) === p);
  }
  function hostOf(u: string) {
    return u.replace(/^https?:\/\/(www\.)?/, "").split(/[/?#]/)[0];
  }
  const esc = (v: unknown) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const attrs = (o: Record<string, unknown>) =>
    Object.entries(o)
      .filter(
        ([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length),
      )
      .map(([k, v]) => ` ${k}="${esc(Array.isArray(v) ? v.join(" ") : v)}"`)
      .join("");
  const noTco = (t: string) => t.replace(/https?:\/\/t\.co\/\S+/g, "").trim();
  const ENTITIES: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  const decodeEntity = (m: string, e: string) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? m;
    const n = e[1].toLowerCase() === "x" ? Number.parseInt(e.slice(2), 16) : Number(e.slice(1));
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
  };
  // Feed text as words: tags out, entities decoded, then tags out again for a teaser whose HTML was itself escaped.
  function plainText(s: string | undefined): string | undefined {
    if (s == null) return s;
    // Markup is stripped first and entities decoded after, once: a tag the author wrote as text arrives escaped
    // (&lt;div&gt;) and must survive as the visible text <div>, so nothing is stripped after decoding.
    return s
      .replace(/<[^>]*>/g, " ")
      .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeEntity)
      .replace(/\s+/g, " ")
      .trim();
  }
  function extras(
    q: Quoted | null | undefined,
    links: string[],
    meta: Record<string, LinkMeta>,
    media: { type: string; alt?: string }[],
  ) {
    const out: string[] = [];
    if (q)
      out.push(
        `<quoted${attrs({ id: q.id, author: q.author, name: q.name })}>${esc(noTco(q.text))}</quoted>`,
      );
    for (const l of links)
      out.push(
        `<link${attrs({ url: l, title: meta[l]?.title, description: meta[l]?.description })}/>`,
      );
    for (const m of media) out.push(`<media${attrs({ type: m.type, alt: m.alt })}/>`);
    return out;
  }
  function renderPost(p: Post, tag: DataTag = "post") {
    const lines = [
      `<${tag}${attrs({ id: p.id, date: p.date, kind: p.kind, lang: p.lang, parts: p.parts?.length, sponsored: p.sponsored ? "yes" : undefined, mentions: p.mentions, hashtags: p.hashtags, cashtags: p.cashtags })}>`,
    ];
    if (p.parts) {
      for (const [i, pt] of p.parts.entries()) {
        const inner = extras(pt.quoted, pt.links ?? [], pt.link_meta ?? {}, pt.media ?? []);
        lines.push(
          `<part${attrs({ n: i + 1, id: pt.id, date: pt.date })}>${inner.length ? `\n<text>${esc(noTco(pt.text))}</text>\n${inner.join("\n")}\n` : esc(noTco(pt.text))}</part>`,
        );
      }
    } else {
      lines.push(
        `<text>${esc(noTco(p.text))}</text>`,
        ...extras(p.quoted, p.links, p.link_meta, p.media),
      );
    }
    if (p.poll) lines.push(`<poll>${esc(p.poll.join(" | "))}</poll>`);
    lines.push(`</${tag}>`);
    return lines.join("\n");
  }

  // Every X call waits its turn in the module-level queue (xTurn), one request a second across all builds.
  async function xGet(path: string, params: Record<string, string>) {
    return xTurn(async () => {
      const url = `https://api.x.com/2/${path}?${new URLSearchParams(params)}`;
      let r = await fetch(url, { headers: { Authorization: `Bearer ${X}` } });
      if (r.status === 429) {
        await new Promise((res) => setTimeout(res, 2000));
        r = await fetch(url, { headers: { Authorization: `Bearer ${X}` } });
      }
      const body = await r.json().catch(() => ({}));
      return { status: r.status, body };
    });
  }
  // Every field X returns to the app token (owner, September 26: pull everything; the model sees only
  // what renderPost shows). Six profile fields X refuses to an app token are left out of the request.
  const USER_FIELDS =
    "affiliation,created_at,description,entities,id,is_identity_verified,location,most_recent_tweet_id,name,pinned_tweet_id,profile_banner_url,profile_image_url,protected,public_metrics,url,username,verified,verified_type,withheld";
  const POST_FIELDS = {
    "tweet.fields":
      "article,attachments,author_id,card_uri,community_id,context_annotations,conversation_id,created_at,display_text_range,edit_controls,edit_history_tweet_ids,entities,geo,id,in_reply_to_user_id,lang,media_metadata,note_tweet,possibly_sensitive,public_metrics,referenced_tweets,reply_settings,scopes,source,text,withheld",
    // Only what the model reads: the quoted post and its author, media, polls, places and articles. The
    // profiles of mentioned accounts, the person's own profile on every call and edit-history posts are
    // not fetched (owner, September 26: the handles are already in the post text).
    expansions:
      "article.cover_media,article.media_entities,attachments.media_keys,attachments.poll_ids,geo.place_id,referenced_tweets.id,referenced_tweets.id.attachments.media_keys,referenced_tweets.id.author_id",
    "user.fields": USER_FIELDS,
    "media.fields":
      "alt_text,duration_ms,height,media_key,preview_image_url,public_metrics,type,url,variants,width",
    "poll.fields": "duration_minutes,end_datetime,id,options,voting_status",
    "place.fields": "contained_within,country,country_code,full_name,geo,id,name,place_type",
  };
  // A sponsored or referral post: a partner or ad hashtag, a referral or affiliate parameter in a link,
  // or a known affiliate redirect host. Its brand is not an interest and not a cited account.
  const SPONSOR_TAG = /^#(\w*partner\w*|ad|ads|sponsored|paid\w*|affiliate\w*|promo\w*|gifted)$/i;
  const REFERRAL_PARAM =
    /[?&](ref|refcode|ref_code|referral|refid|via|aff|aff_id|affiliate|co-from|invite|invite_code|code|promo|coupon)=/i;
  const AFFILIATE_HOST =
    /(^|\.)(pxf\.io|sjv\.io|ojrq\.net|impact\.com|awin1\.com|shareasale\.com|partnerstack\.com|go\.skimresources\.com|viglink\.com|redirect\.viglink\.com|amzn\.to|rstyle\.me|linksynergy\.com|tkqlhce\.com|anrdoezrs\.net|dpbolvw\.net|jdoqocy\.com|kqzyfj\.com)$/i;
  const isReferralLink = (u: string) => REFERRAL_PARAM.test(u) || AFFILIATE_HOST.test(hostOf(u));
  const unX = (t: string) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  // Turns X's answer into posts. Reposts are dropped; a reply is kept only when it answers the person's
  // own post (a thread continuation); a reply to anyone else is dropped.
  function toPosts(body: any): { posts: Post[]; users: number } {
    const users: Record<string, any> = Object.fromEntries(
      (body.includes?.users ?? []).map((u: any) => [u.id, u]),
    );
    const tweets: Record<string, any> = Object.fromEntries(
      (body.includes?.tweets ?? []).map((t: any) => [t.id, t]),
    );
    const media: Record<string, any> = Object.fromEntries(
      (body.includes?.media ?? []).map((m: any) => [m.media_key, m]),
    );
    const polls: Record<string, any> = Object.fromEntries(
      (body.includes?.polls ?? []).map((m: any) => [m.id, m]),
    );
    const posts: Post[] = [];
    for (const t of body.data ?? []) {
      const refs: any[] = t.referenced_tweets ?? [];
      if (refs.some((r) => r.type === "retweeted")) continue;
      const reply = refs.find((r) => r.type === "replied_to");
      if (reply && t.in_reply_to_user_id !== S.uid) continue;
      const q = refs.find((r) => r.type === "quoted");
      const qt = q ? tweets[q.id] : null;
      const quoted: Quoted | null = q
        ? {
            id: q.id,
            author: qt ? `@${users[qt.author_id]?.username ?? "?"}` : "@?",
            name: qt ? (users[qt.author_id]?.name ?? "") : "",
            text: qt ? unX(qt.note_tweet?.text ?? qt.text) : "(X did not return the quoted post)",
          }
        : null;
      const ents = t.note_tweet?.entities ?? t.entities ?? {};
      const urls = (ents.urls ?? []).filter(
        (e: any) =>
          !SOCIAL.some(
            (d) =>
              hostOf(e.expanded_url ?? e.url) === d ||
              hostOf(e.expanded_url ?? e.url).endsWith(`.${d}`),
          ),
      );
      const link_meta: Record<string, LinkMeta> = {};
      for (const e of urls)
        link_meta[(e.expanded_url ?? e.url).replace(/^https?:\/\/(www\.)?/, "")] = {
          title: e.title,
          description: e.description,
        };
      posts.push({
        id: t.id,
        date: t.created_at.slice(0, 10),
        kind: reply ? "thread_part" : quoted ? "quote" : "original",
        lang: t.lang,
        text: unX(t.note_tweet?.text ?? t.text),
        quoted,
        quoted_account: quoted?.author ?? null,
        parent_id: reply?.id,
        links: Object.keys(link_meta),
        link_meta,
        mentions: (ents.mentions ?? []).map((m: any) => `@${m.username}`),
        hashtags: (ents.hashtags ?? []).map((h: any) => `#${h.tag}`),
        cashtags: (ents.cashtags ?? []).map((c: any) => `$${c.tag}`),
        media: (t.attachments?.media_keys ?? []).map((k: string) => ({
          type: media[k]?.type ?? "media",
          alt: media[k]?.alt_text,
        })),
        poll: (t.attachments?.poll_ids ?? []).flatMap((id: string) =>
          (polls[id]?.options ?? []).map((o: any) => o.label),
        ),
        likes: t.public_metrics?.like_count,
        conversation_id: t.conversation_id,
        reply_count: t.public_metrics?.reply_count,
        edit_ids: t.edit_history_tweet_ids,
        raw: t,
      });
      const last = posts[posts.length - 1];
      if (!last.poll?.length) delete last.poll;
      last.sponsored =
        last.hashtags.some((h) => SPONSOR_TAG.test(h)) || last.links.some(isReferralLink);
    }
    return { posts, users: Object.keys(users).length };
  }
  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString().replace(/\.\d+Z$/, "Z");

  // ---------- Jev ----------
  async function jev(
    state: unknown,
    questions: Record<string, { instructions: string; criteria: { true: string; false: string } }>,
  ) {
    const t0 = Date.now();
    const r = await fetch("https://ai-gateway.vercel.sh/v1/evaluate", {
      method: "POST",
      headers: { Authorization: `Bearer ${GW}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "typesafe-ai/jev",
        state,
        questions: Object.fromEntries(
          Object.entries(questions).map(([k, q]) => [k, { type: "boolean", ...q }]),
        ),
      }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(`Jev ${r.status}: ${JSON.stringify(body).slice(0, 200)}`);
    // Jev runs on the owner's own TypeSafe key, so the Gateway bills 0 and TypeSafe bills directly;
    // marketCost is the Gateway's figure for what the call costs.
    const cost =
      Number(body.providerMetadata?.gateway?.cost ?? 0) ||
      Number(body.providerMetadata?.gateway?.marketCost ?? 0);
    S.jev_usd += cost;
    const answers: Record<string, number> = Object.fromEntries(
      Object.entries(body.answers ?? {}).map(([k, v]: any) => [k, v.probability]),
    );
    return {
      answers,
      ms: Date.now() - t0,
      tokens: body.usage?.inputTokens,
      marketCost: body.providerMetadata?.gateway?.marketCost,
      cost,
    };
  }
  async function jevOrNull(...a: Parameters<typeof jev>) {
    try {
      return await io.jev(...a);
    } catch (e) {
      S.log.push({
        step: S.step,
        tool: "jev",
        input: null,
        seen: (e as Error).message,
        full: null,
        ms: 0,
      });
      return null;
    }
  }
  // Rows travel in the state keyed by id, so a question names its row by path and carries no outside text.
  const rowsState = () =>
    Object.fromEntries(
      TABLE.map((r) => [
        r.id,
        { name: r.name, focus: r.focus, lang: r.lang, description: r.description },
      ]),
    );
  const ROW_Q = (id: string) => ({
    instructions: `Would the recurring stream \`rows.${id}\` be a useful candidate for this person's monitor, judging what the stream publishes against their stated beat and their activity? The stated beat alone can justify a match. Absence from this small sample of posts is not negative evidence. The language a source publishes in does not reduce relevance.`,
    criteria: {
      true: "The stream regularly covers subjects relevant to the stated beat or to interests the activity shows.",
      false: "The stream's coverage is materially unrelated to the stated beat and the activity.",
    },
  });
  function jevState() {
    const listed = new Set(
      ((S.finish?.directions as { post_ids: string[] }[]) ?? []).flatMap((d) => d.post_ids),
    );
    const offBeat = new Set(S.map?.off_beat_post_ids ?? []);
    // A sponsored post shows what they were paid to say, so it is not part of the activity a row is judged against.
    const posts = (
      listed.size
        ? [...S.posts.values()].filter((p) => listed.has(p.id))
        : [...S.posts.values()].filter((p) => !offBeat.has(p.id))
    ).filter((p) => !p.sponsored);
    return { beat, posts: posts.map(jevPost), rows: rowsState() };
  }
  const jevPost = (p: Post) => ({
    date: p.date,
    kind: p.kind,
    text: p.text,
    quoted: p.quoted ? { author: p.quoted.author, text: p.quoted.text } : null,
    sites: p.links.map(hostOf),
  });
  // One question per row per direction: does the stream publish on this direction? The state is the direction
  // itself and the posts that show it, so a row is judged against one subject, not the whole beat.
  const DIR_Q = (id: string, d: Direction) => ({
    instructions: `Does the recurring stream \`rows.${id}\` regularly publish on the one direction of the person's interests described in \`direction\` (its label, concept and vocabulary)? Judge what the stream publishes against that direction; the person's posts for it are given in \`posts\` as context.`,
    criteria: {
      true: "The stream regularly carries items on this direction.",
      false:
        "The stream rarely or never carries items on this direction, even if it is broadly about the same field.",
    },
  });
  function dirState(d: Direction) {
    const ids = new Set(d.post_ids);
    return {
      beat,
      direction: { label: d.label, concept: d.concept, vocabulary: d.vocabulary },
      posts: [...S.posts.values()].filter((p) => ids.has(p.id) && !p.sponsored).map(jevPost),
      rows: rowsState(),
    };
  }
  // Fills the picks by taking turns across the directions: the best unused row for direction 1, then for
  // direction 2, and so on, rounds until the page is full or no direction has a strong row left; the
  // remaining slots go to the best rows by overall score. Every pick carries the direction it was taken for.
  // A direction stops taking turns at an even share of the page plus PICK_CAP_EXTRA, so once the narrow
  // directions run out of strong rows the broadest one cannot take every remaining turn.
  function fillPicks(
    rows: Pick[],
    dirs: Direction[],
    dirScores: Record<string, Record<string, number>>,
    n: number,
  ): Pick[] {
    const used = new Set<string>();
    const publishers = new Set<string>();
    const free = (r: Pick) => !used.has(r.id) && !publishers.has(r.name.toLowerCase());
    const take = (r: Pick) => {
      used.add(r.id);
      publishers.add(r.name.toLowerCase());
    };
    const out: Pick[] = [];
    const cap = Math.ceil(n / dirs.length) + PICK_CAP_EXTRA;
    const taken = new Map<string, number>();
    for (let progress = true; progress && out.length < n; ) {
      progress = false;
      for (const d of dirs) {
        if (out.length >= n) break;
        if ((taken.get(d.label) ?? 0) >= cap) continue;
        const best = rows
          .filter((r) => free(r) && (dirScores[d.label]?.[r.id] ?? 0) >= STRONG)
          .sort((a, b) => (dirScores[d.label][b.id] ?? 0) - (dirScores[d.label][a.id] ?? 0))[0];
        if (!best) continue;
        take(best);
        taken.set(d.label, (taken.get(d.label) ?? 0) + 1);
        out.push({ ...best, direction: d.label, direction_score: dirScores[d.label][best.id] });
        progress = true;
      }
    }
    // free() is asked per row, not once up front: taking a row uses up its publisher's other streams.
    for (const r of rows
      .filter((r) => r.band !== "dropped")
      .sort(
        (a, b) =>
          (b.evidence ? 1 : 0) - (a.evidence ? 1 : 0) || (b.score ?? 0.5) - (a.score ?? 0.5),
      )) {
      if (out.length >= n) break;
      if (!free(r)) continue;
      take(r);
      out.push(r);
    }
    return out;
  }
  // A direction with fewer than GAP_STRONG_ROWS strong table rows is a gap the table cannot fill (Nihan's AI video
  // direction had rows between 0.5 and 0.75 only; Liam's video direction had exactly one strong row).
  function tableGapsOf(
    dirs: Direction[],
    dirScores: Record<string, Record<string, number>>,
    rows: Row[],
  ): string[] {
    return dirs
      .filter(
        (d) =>
          rows.filter((r) => r.kind !== "x_account" && (dirScores[d.label]?.[r.id] ?? 0) >= STRONG)
            .length < GAP_STRONG_ROWS,
      )
      .map((d) => d.label);
  }
  // A pick taken for a direction is judged by the score it was taken on; only an overall pick uses the overall band.
  const isTicked = (p: Pick) =>
    (p.direction_score ?? 0) >= STRONG || (!p.direction && p.band === "strong");
  // One row per publisher on the finished page too: a pick whose publisher also has an added row gives way to the
  // added row, which was written for a gap (Reshad's page carried Football España both as a pick and as an added source).
  function picksBesideAdded(
    picks: Pick[],
    added: Record<string, unknown>[],
  ): { picks: Pick[]; removed: string[] } {
    const byPublisher = new Map(added.map((r) => [String(r.name ?? "").toLowerCase(), r]));
    const removed: string[] = [];
    const kept = picks.filter((p) => {
      const a = byPublisher.get(p.name.toLowerCase());
      if (a)
        removed.push(
          `pick ${p.id}: ${p.name} is also the added source ${String(a.target)}, which serves ${String(a.direction)}; the added row is kept`,
        );
      return !a;
    });
    return { picks: kept, removed };
  }

  // A call's cost as the answer itself reports it. The generation lookup only finds a call about a minute
  // later, so it is not used; a call on the owner's own key (BYOK) reports 0 and its marketCost instead.
  const costOf = (meta: any) =>
    Number(meta?.gateway?.cost ?? 0) || Number(meta?.gateway?.marketCost ?? 0);

  // ---------- the writer, outside the loop's context: it sees only what the checker read ----------
  const WRITER = fillCaps(WRITER_TEMPLATE);
  async function writeRow(
    i: number,
    check: Awaited<ReturnType<typeof checkSource>>,
    retryReason?: string,
  ) {
    const input = {
      i,
      url: check.target ?? check.url,
      items: check.sample.map((s) => ({ title: s.title, teaser: s.teaser })),
    };
    const prompt =
      JSON.stringify(input) +
      (retryReason
        ? `\nYour previous row was refused: ${retryReason}. Write it again within the rules.`
        : "");
    const r = await generateText({
      model: MODEL,
      reasoning: "low",
      system: WRITER,
      prompt,
    });
    const cost = costOf(r.providerMetadata);
    S.writer_usd += cost;
    const line = r.text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("{"));
    let row: any = null;
    try {
      row = line ? JSON.parse(line) : null;
    } catch {}
    return { row, raw: r.text, usage: r.usage, cost, problems: rowProblems(row) };
  }
  // The row is checked at the door against the same numbers the writer was told (fillCaps fills them).
  function rowProblems(row: any): string[] {
    if (!row || typeof row !== "object") return ["not a JSON object"];
    const out: string[] = [];
    if (typeof row.name !== "string" || !row.name.trim() || row.name.length > 80)
      out.push("name must be a short string");
    const words = typeof row.focus === "string" ? row.focus.trim().split(/\s+/).length : 0;
    if (words < FOCUS_WORDS.min || words > FOCUS_WORDS.max)
      out.push(`focus must be ${FOCUS_WORDS.min} to ${FOCUS_WORDS.max} words`);
    if (typeof row.lang !== "string" || !/^[a-z]{2}$/.test(row.lang))
      out.push("lang must be a two-letter code");
    const d = typeof row.description === "string" ? row.description.trim() : "";
    if (d.length < DESC_CHARS.min || d.length > DESC_CHARS.max)
      out.push(
        `description must be ${DESC_CHARS.min} to ${DESC_CHARS.max} characters, got ${d.length}`,
      );
    // The sentence count, markdown and em dash checks submit applies to a summary (the prompt-format draft promises them for a row too).
    out.push(...freeTextProblems("the description", d, DESC_SENTENCES));
    if (/\u2014/.test(String(row.name ?? "")) || /\u2014/.test(String(row.focus ?? "")))
      out.push("no em dashes");
    return out;
  }
  // A new row's id has the seed's shape: name and focus, lowercased, every other run of characters one hyphen
  // (España gives espan-a, as in the seed), with a number added if the seed or this run already holds it. Each run
  // reloads the unchanged seed, so a row written here never joins a later run's table: an intended harness boundary.
  const slugId = (name: string, focus: string) =>
    `${name} ${focus}`
      .normalize("NFD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  function newRowId(name: string, focus: string) {
    const taken = new Set([...TABLE.map((r) => r.id), ...S.rows.map((r) => String(r.id))]);
    const base = slugId(name, focus);
    let id = base;
    for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
    return id;
  }
  // The network and model calls the tools make, in one place so --selftest can stand in for them.
  const io = { checkSource, jev, writeRow };

  // Accounts from their posts: the ones they quote, and the ones they mention (a mention may be a thank-you
  // or a conversation, so the model decides which are sources).
  function theirAccounts() {
    const me = `@${handle.toLowerCase()}`;
    const own = [...S.posts.values()].filter((p) => !p.sponsored);
    const quoted = new Set(
      own
        .flatMap((p) => [p.quoted, ...(p.parts ?? []).map((pt) => pt.quoted)])
        .map((q) => q?.author.toLowerCase())
        .filter((h): h is string => Boolean(h) && h !== me && h !== "@?"),
    );
    const mentioned = new Set(
      own
        .flatMap((p) => p.mentions.map((h) => h.toLowerCase()))
        .filter((h) => h !== me && !quoted.has(h)),
    );
    return { quoted, mentioned };
  }
  const handleOf = (r: Row) => `@${r.target.replace(/\/+$/, "").split("/").pop()}`;
  // find_accounts is refused, and so not offered, once the accounts they quote plus the table's account rows reach the cap.
  const accountsReached = () =>
    new Set([
      ...theirAccounts().quoted,
      ...(S.rank?.accounts ?? []).map((r) => handleOf(r).toLowerCase()),
    ]).size >= CAPS.accounts;

  // ---------- tools ----------
  // A table gap needs at least one candidate actually checked before submit; submit refuses otherwise and is not offered.
  function submitReady() {
    return (S.rank?.table_gaps.length ?? 0) === 0 || S.checkAttempts > 0;
  }
  // A model's free text is checked before anyone reads it: its length in sentences, no markdown, no em dashes
  // (the prompt-format draft promises this; submit did not check it before round 7).
  const MARKDOWN =
    /\*\*|`|\[[^\]]*\]\([^)]*\)|(^|\s)\*[^\s*][^*]*\*(?=\s|[.,;:!?]|$)|^\s*(#{1,6}|[-*+]|\d+\.)\s/m;
  // A period after a title, a company suffix, e.g., i.e., vs. or a capital letter (U.S., J. Doe) does not end a
  // sentence; a period inside a number or a domain has no space after it, so it never splits.
  const NOT_AN_END = /(?:\b(?:Dr|Mr|Mrs|Ms|Inc|Ltd|Co|Corp|St|vs|e\.g|i\.e)|\b[A-Z])\.$/;
  const sentenceCount = (t: string) => {
    const parts = t
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    return parts.filter((p, i) => i === parts.length - 1 || !NOT_AN_END.test(p)).length;
  };
  function freeTextProblems(
    what: string,
    t: string,
    { min, max }: { min: number; max: number },
  ): string[] {
    const out: string[] = [];
    const n = sentenceCount(t);
    if (n < min || n > max)
      out.push(
        `${what} has ${n} sentence${n === 1 ? "" : "s"}; write ${min === max ? min : `${min} to ${max}`}`,
      );
    if (MARKDOWN.test(t)) out.push(`${what} uses markdown; write plain sentences`);
    if (/\u2014/.test(t)) out.push(`${what} has an em dash; use a comma, a period or parentheses`);
    return out;
  }
  function refuse(msg: string) {
    return { seen: `REFUSED: ${msg}`, refused: true };
  }
  type Out = { seen: string; [k: string]: unknown };
  const modelSees = <T extends Out>({ output }: { output: T }) => ({
    type: "content" as const,
    value: [{ type: "text" as const, text: output.seen }],
  });

  function logged<S extends z.ZodType>(
    name: string,
    _schema: S,
    run: (input: z.infer<S>) => Promise<Out>,
  ) {
    return async (input: z.infer<S>): Promise<Out> => {
      const t0 = Date.now();
      const out = await run(input);
      S.log.push({
        step: S.step,
        tool: name,
        input,
        seen: out.seen,
        full: out,
        ms: Date.now() - t0,
        x_usd: usd(typeof out.x_usd === "number" ? out.x_usd : 0),
      });
      return out;
    };
  }

  // A direction named by the model must be one of the map's labels (case does not matter); returns the map's spelling.
  const mapLabel = (label: string, dirs: Direction[] = S.map?.directions ?? []) =>
    dirs.find((d) => d.label.toLowerCase() === label.trim().toLowerCase())?.label ?? null;
  const statusOf = (n: number) => (n >= COVERED ? "covered" : n > 0 ? "thin" : "none");
  // A thread part's id stands for its thread, so a thread counts once toward covered.
  function unitIds(ids: string[]) {
    const partOf = new Map(
      [...S.posts.values()].flatMap((p) => (p.thread_ids ?? []).map((id) => [id, p.id] as const)),
    );
    return [...new Set(ids.map((id) => partOf.get(id) ?? id))];
  }
  function withUnits<T extends { post_ids: string[] }>(ds: T[]): T[] {
    return ds.map((d) => ({ ...d, post_ids: unitIds(d.post_ids) }));
  }
  const countable = (ids: string[]) =>
    new Set(ids.filter((id) => !S.posts.get(id)?.sponsored)).size;
  function statusErrors(ds: { label: string; post_ids: string[]; status: string }[]) {
    return ds
      .filter((d) => statusOf(countable(d.post_ids)) !== d.status)
      .map(
        (d) =>
          `${d.label} lists ${countable(d.post_ids)} posts that are not sponsored, so its status is ${statusOf(countable(d.post_ids))}, not ${d.status}`,
      );
  }
  const direction = z.object({
    label: z.string().describe("a few words naming the direction"),
    concept: z
      .string()
      .describe("one sentence: what this direction is about, as a concept, not a keyword"),
    vocabulary: z
      .array(z.string())
      .describe(
        "the words, names, hashtags, handles and spellings this person uses for it, in every language they write, plus the general words anyone would use for the subject",
      ),
    post_ids: z
      .array(z.string())
      .describe("ids of the on-beat posts that show it; empty if none yet"),
    status: z
      .enum(["covered", "thin", "none"])
      .describe(
        fillCaps(
          "covered: {COVERED} or more of the listed posts show it; thin: 1 to {THIN}; none: 0",
        ),
      ),
  });

  const IN_map_beat = z.object({
    on_beat_post_ids: z.array(z.string()).describe("ids of the seed posts that belong to the beat"),
    off_beat_post_ids: z.array(z.string()).describe("ids of the seed posts that do not"),
    directions: z
      .array(direction)
      .min(DIRECTIONS.min)
      .max(DIRECTIONS.max)
      .describe(
        fillCaps(
          "{DIR_MIN} to {DIR_MAX} directions: every part of the beat sentence, plus any subject that recurs in the posts and belongs to the beat",
        ),
      ),
    note: z.string().describe("one or two sentences on what kind of poster this is"),
  });
  const IN_search_posts = z.object({
    level: z.number().int().min(1).max(CAPS.levels).describe(fillCaps("1 to {LEVELS}")),
    direction: z.string().describe("the direction this search serves, by its label from your map"),
    keywords: z
      .string()
      .describe(
        fillCaps(
          'the keywords only: one wide group of terms joined by OR, names of more than one word in quotes, up to about {KEYWORD_CHARS} characters; a second group beside it only to pin down a term with several meanings. One group: "FC Barcelona" OR Barça OR FCB OR Laporta OR fichaje. A second group only to pin a term: Canvas (video OR Dreamina)',
        ),
      ),
    why: z.string().describe("one line: what you expect this search to show"),
  });
  const IN_read_link = z.object({
    url: z.string().describe("the expanded address, as listed beside the post"),
    post_id: z.string().describe("the post that linked it"),
  });
  const IN_finish_reading = z.object({
    directions: z
      .array(direction)
      .min(DIRECTIONS.min)
      .max(DIRECTIONS.max)
      .describe("the final map: every direction with the posts that show it and its status"),
    stop_reason: z
      .enum(["enough", "thin", "saturated", "cap"])
      .describe(
        fillCaps(
          "enough: every direction is covered ({COVERED} or more posts); saturated: the last level brought nothing new about the beat; thin: fewer than {THIN_SEED} on-beat seed posts; cap: a limit was reached",
        ),
      ),
    note: z.string().describe("one or two sentences: what the reading showed"),
  });
  const IN_rank_table = z.object({});
  const IN_check_source = z.object({
    url: z.string().describe("the candidate address"),
    direction: z
      .string()
      .describe("the uncovered direction it would serve, by its label from your final map"),
  });
  const IN_write_row = z.object({
    url: z.string().describe("the accepted address exactly as check_source returned it"),
    direction: z
      .string()
      .describe("the uncovered direction it serves, by its label from your final map"),
    post_ids: z
      .array(z.string())
      .describe(
        "the posts that show that direction; empty when the direction comes from the beat sentence alone",
      ),
  });
  const IN_submit = z.object({
    summary: z
      .string()
      .describe(
        fillCaps(
          "{SUM_MIN} to {SUM_MAX} plain sentences on what this person monitors, with their own posts as the examples; no post ids, not starting with a handle",
        ),
      ),
    drops: z
      .array(
        z.object({
          row_id: z.string().describe("the id of the pick to drop"),
          duplicate_of: z.string().describe("the id of the pick that publishes the same stream"),
        }),
      )
      .describe(
        "only a pick that publishes the same stream as another pick; empty when there is none",
      ),
    uncovered: z
      .array(z.string())
      .describe(
        "the label of every direction you looked for a source for, whether or not one was found; empty when none was uncovered",
      ),
    accounts: z
      .array(
        z.object({
          handle: z.string().nullable().describe("@handle, or null when you never saw the handle"),
          name: z.string().describe("the display name"),
          origin: z.enum(["their posts", "the table", "search"]).describe("where it came from"),
          why: z
            .string()
            .describe(
              fillCaps(
                "one reason in {REASON_SENTENCES} plain sentence, tied to their posts or the beat",
              ),
            ),
        }),
      )
      .describe(
        fillCaps(
          "at least {ACCOUNTS}: accounts they quote or cite as a source, then the table's account rows, then find_accounts",
        ),
      ),
    evidence: z
      .enum(["normal", "thin"])
      .describe(fillCaps("thin when the seed held fewer than {THIN_SEED} on-beat posts")),
  });
  const IN_find_accounts = z.object({
    keywords: z
      .string()
      .describe(
        "the beat's main terms joined by OR, names of more than one word in quotes; words only, no from:, is:, has:, url: or lang:",
      ),
  });

  const tools = {
    map_beat: tool({
      description: fillCaps(
        "Records what you understood about the person. Call it first, once. Pass the seed posts sorted on-beat and off-beat, {DIR_MIN} to {DIR_MAX} directions (each a concept with the person's own vocabulary for it, the on-beat posts that show it and its status) and one or two sentences on what kind of poster this is. You get back the counts and what is left for phase 2.",
      ),
      inputSchema: IN_map_beat,
      execute: logged("map_beat", IN_map_beat, async (input) => {
        if (S.phase !== "map") return refuse("map_beat is called once, at the start");
        input = {
          ...input,
          on_beat_post_ids: unitIds(input.on_beat_post_ids),
          off_beat_post_ids: unitIds(input.off_beat_post_ids),
          directions: withUnits(input.directions),
        };
        const known = new Set(S.posts.keys());
        const bad = [
          ...input.on_beat_post_ids,
          ...input.off_beat_post_ids,
          ...input.directions.flatMap((d) => d.post_ids),
        ].filter((id) => !known.has(id));
        if (bad.length)
          return refuse(`unknown post ids: ${bad.join(", ")}. Use only ids you were given.`);
        const off = new Set(input.off_beat_post_ids);
        const both = [
          ...input.on_beat_post_ids,
          ...input.directions.flatMap((d) => d.post_ids),
        ].filter((id) => off.has(id));
        if (both.length)
          return refuse(
            `posts marked off-beat are also listed as on-beat or as a direction's evidence: ${[...new Set(both)].join(", ")}`,
          );
        const wrong = statusErrors(input.directions);
        if (wrong.length)
          return refuse(`status does not match the posts listed: ${wrong.join("; ")}`);
        S.map = {
          directions: input.directions,
          off_beat_post_ids: input.off_beat_post_ids,
          on_beat_count: input.on_beat_post_ids.length,
        };
        S.phase = "read";
        const thin = input.on_beat_post_ids.length < THIN_SEED;
        return {
          seen: `Recorded ${input.directions.length} directions. On-beat seed posts: ${input.on_beat_post_ids.length}.${thin ? " Thin profile: run level 1 from the beat sentence, then finish_reading." : ""} Left: ${CAPS.searches} searches, ${CAPS.posts - S.posts.size} posts, ${CAPS.levels} levels. Now level 1: one search_posts call per direction, all in this turn.`,
          thin,
        };
      }),
      toModelOutput: modelSees,
    }),

    search_posts: tool({
      description: fillCaps(
        "Searches this person's own posts of the past year for one direction. Use it in phase 2: level 1 for every direction in one turn, level 2 and {LEVELS} for a direction still thin or none. Pass the level, the direction's label from your map, the keywords only (one wide OR group up to about {KEYWORD_CHARS} characters, multi-word names in quotes, a second group only to pin a term with several meanings) and one line on what you expect; code adds the account, the year and the reply and repost filters. You get back the posts not seen before, in the same format as the seed, with the counters.",
      ),
      inputSchema: IN_search_posts,
      execute: logged(
        "search_posts",
        IN_search_posts,
        async ({ level, direction, keywords, why }) => {
          if (S.phase !== "read")
            return refuse(
              S.phase === "map"
                ? "call map_beat first"
                : S.phase === "rank"
                  ? "reading is finished; call rank_table"
                  : "reading is finished; phase 4 uses check_source, write_row, find_accounts and submit",
            );
          if (S.searches >= CAPS.searches)
            return refuse(`search cap reached (${CAPS.searches}). Call finish_reading.`);
          if (S.posts.size >= CAPS.posts)
            return refuse(
              `post cap reached (${CAPS.posts}; a thread counts as one). Call finish_reading.`,
            );
          if (level < S.level) return refuse(`level ${level} is over; you are on level ${S.level}`);
          if (level > S.level + 1)
            return refuse(`level ${level} cannot start before level ${S.level + 1}`);
          if (/\b(from|is|has|url|lang|to|conversation_id):/i.test(keywords))
            return refuse("keywords only: no from:, is:, has:, url:, lang: or other operators");
          if (keywords.length > KEYWORD_HARD)
            return refuse(
              `the keyword expression is ${keywords.length} characters; keep it to about ${KEYWORD_CHARS}`,
            );
          const label = mapLabel(direction);
          if (!label)
            return refuse(
              `"${direction}" is not a direction in your map; use one of: ${S.map!.directions.map((d) => d.label).join(", ")}`,
            );
          if (level === 1) S.searchedL1.add(label.toLowerCase());
          S.level = level;
          S.searches += 1;
          const n = S.searches;
          const query = `from:${handle} (${keywords}) -is:reply -is:retweet`;
          const { status, body } = await xGet("tweets/search/all", {
            query,
            max_results: "10",
            start_time: yearAgo,
            ...POST_FIELDS,
          });
          if (status !== 200)
            return {
              seen: `X returned ${status}: ${body.title ?? body.detail ?? ""}. Try different keywords or move on.`,
              query,
              status,
              body,
            };
          const { posts } = toPosts(body);
          const searchUsd = xBill(body);
          const fresh = addPosts(posts);
          const threadUsd = await completeThreads(fresh);
          const seen = `<search_result${attrs({ level, search: n, of: CAPS.searches, direction, returned: posts.length, new: fresh.length, already_seen: posts.length - fresh.length, collected: S.posts.size, cap: CAPS.posts })}>\n${fresh.map((f) => renderPost(f)).join("\n") || "nothing new"}\n</search_result>`;
          return {
            seen,
            query,
            level,
            returned: posts.length,
            new: fresh.length,
            direction,
            why,
            posts: fresh,
            x_usd: searchUsd + threadUsd,
          };
        },
      ),
      toModelOutput: modelSees,
    }),

    read_link: tool({
      description: fillCaps(
        "Reads one page the person linked, so you learn what the site is and whether it fits the beat. Use it in phase 2, first for sites linked more than once, at most {LINKS} sites per build, one call per site. Pass the address from the post's link (never a t.co address) and the id of the post that carries it; code refuses a link from an off-beat post and a referral link whose preview card already says what the product is. You get back the page's title, its whole text with the page code removed (a PDF up to {PDF_PAGES} pages) and a fit number from 0 to 1 for the beat.",
      ),
      inputSchema: IN_read_link,
      execute: logged("read_link", IN_read_link, async ({ url, post_id }) => {
        if (S.phase !== "read") return refuse("read_link belongs to phase 2");
        if (S.linksRead >= CAPS.links) return refuse(`link cap reached (${CAPS.links})`);
        if (SOCIAL.some((d) => hostOf(url) === d || hostOf(url).endsWith(`.${d}`)))
          return refuse(`${hostOf(url)} is a social link; read the sites listed under links`);
        const from = S.posts.get(post_id);
        if (!from)
          return refuse(
            `unknown post id ${post_id}; give the id of the post that carries the link`,
          );
        if (S.map?.off_beat_post_ids.includes(post_id))
          return refuse(`post ${post_id} is off-beat in your map, so its links are not read`);
        const bare = url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
        const postLinks = [
          ...from.links,
          ...(from.parts ?? []).flatMap((pt) => pt.links ?? []),
        ].map((l) => l.replace(/\/$/, ""));
        if (!postLinks.includes(bare))
          return refuse(
            `${bare} is not a link of post ${post_id}; its links are: ${postLinks.join(", ") || "none"}`,
          );
        if (S.readUrls.has(bare)) return refuse(`${bare} was already read this build`);
        const card =
          from.link_meta[bare] ?? from.parts?.map((pt) => pt.link_meta?.[bare]).find(Boolean);
        if (isReferralLink(url) && card?.title)
          return refuse(
            "a referral or affiliate link whose preview card already says what the product is; it is not read",
          );
        const page = await readPage(url, PDF_PAGES);
        // A link that turns out to be an affiliate hop marks its post sponsored, the same as a referral code in the address would have.
        const landedUrl =
          page.finalUrl && page.finalUrl !== url && isReferralLink(page.finalUrl)
            ? page.finalUrl
            : null;
        if (landedUrl) from.sponsored = true;
        const landed = landedUrl
          ? `; it redirected through a referral or affiliate link to ${hostOf(landedUrl)}, so post ${post_id} is now marked sponsored`
          : "";
        // A read that fails does not use up a link slot.
        if (page.error || !page.text)
          return {
            seen: `<page${attrs({ url: page.finalUrl ?? url, readable: "no", reason: `${page.error ?? "no article text (the site may be built entirely in JavaScript)"}${landed}` })}/>`,
            page,
            sponsored_now: Boolean(landedUrl),
          };
        S.linksRead += 1;
        S.readUrls.add(bare);
        // Jev has an input limit; a very long page that it cannot score still reaches the model, marked unscored.
        const jevState = {
          beat,
          page: { url: page.finalUrl ?? url, title: page.title, text: page.text },
        };
        const q = await jevOrNull(jevState, {
          fit: {
            instructions:
              "Does this page's content belong to the person's stated beat, meaning it is the kind of thing someone monitoring that beat would want to see?",
            criteria: {
              true: "The page is about subjects inside the stated beat.",
              false: "The page is about something else.",
            },
          },
        });
        const fit = q?.answers.fit;
        const pdf =
          page.via === "pdf"
            ? { pdf_pages: page.pages, pages_shown: Math.min(page.pages ?? 0, PDF_PAGES) }
            : {};
        return {
          seen: `<page${attrs({ url: page.finalUrl ?? url, title: page.title ?? "untitled", fit: fit == null ? "not scored: Jev could not take a page this long" : fit.toFixed(2), extraction: page.via === "tag-strip" ? "fallback: no article found, page text with code removed" : page.via === "pdf" ? "pdf text" : "article", ...pdf, sponsored: landedUrl ? "the post is now marked sponsored" : undefined })}>\n${esc(page.text)}\n</page>`,
          page,
          fit,
          post_id,
          jev_ms: q?.ms,
          jev_state: {
            beat,
            page: { url: jevState.page.url, title: page.title, text_chars: page.text.length },
          },
          sponsored_now: Boolean(landedUrl),
        };
      }),
      toModelOutput: modelSees,
    }),

    finish_reading: tool({
      description: `Ends phase 2 with the final map. Call it when every direction is covered, when a level brought nothing new, when the seed was thin, or when a cap tripped. Pass every direction with its concept, vocabulary, the posts that show it and its status, the stop reason and one or two sentences on what the reading showed. Code refuses enough while a direction is not covered, a status that does not match the posts listed, and a map whose directions never got a level 1 search; you get back the totals and the next step.`,
      inputSchema: IN_finish_reading,
      execute: logged("finish_reading", IN_finish_reading, async (input) => {
        if (S.phase !== "read") return refuse("finish_reading belongs to phase 2");
        if (S.searches === 0)
          return refuse(
            "level 1 has not run: search every direction once first; the seed is only the newest posts",
          );
        const thinProfile = (S.map?.on_beat_count ?? 0) < THIN_SEED;
        const unsearched = (S.map?.directions ?? [])
          .map((d) => d.label)
          .filter((l) => !S.searchedL1.has(l.toLowerCase()));
        if (!thinProfile && unsearched.length)
          return refuse(
            `level 1 has not run for: ${unsearched.join(", ")}; every direction gets one level 1 search first`,
          );
        input = { ...input, directions: withUnits(input.directions) };
        const offBeat = new Set(S.map?.off_beat_post_ids ?? []);
        const offUsed = input.directions.flatMap((d) => d.post_ids).filter((id) => offBeat.has(id));
        if (offUsed.length)
          return refuse(
            `posts you marked off-beat in map_beat are listed as evidence: ${[...new Set(offUsed)].join(", ")}`,
          );
        const known = new Set(S.posts.keys());
        const bad = input.directions.flatMap((d) => d.post_ids).filter((id) => !known.has(id));
        if (bad.length) return refuse(`unknown post ids: ${bad.join(", ")}`);
        const wrong = statusErrors(input.directions);
        if (wrong.length)
          return refuse(`status does not match the posts listed: ${wrong.join("; ")}`);
        if (input.stop_reason === "enough" && input.directions.some((d) => d.status !== "covered"))
          return refuse(
            `enough needs every direction covered (${COVERED} or more posts); run another level or give the real reason`,
          );
        S.finish = input;
        S.phase = "rank";
        return {
          seen: `Reading finished (${input.stop_reason}) with ${S.posts.size} posts after ${S.searches} searches. Now call rank_table.`,
        };
      }),
      toModelOutput: modelSees,
    }),

    rank_table: tool({
      description: fillCaps(
        "Ranks the shared source table for this person. Call it once, right after finish_reading. It takes nothing: code scores every row against each of your directions and fills the picks by taking turns across the directions, each direction taking at most an even share of the picks plus {PICK_CAP_EXTRA}. You get back up to {PICKS} picks with the direction each was taken for (you may only drop a duplicate), the directions with fewer than {GAP_STRONG_ROWS} strong table rows, the table's account rows that fit, the accounts they quote and mention, and the sites they linked.",
      ),
      inputSchema: IN_rank_table,
      execute: logged("rank_table", IN_rank_table, async () => {
        if (S.phase !== "rank")
          return refuse(
            S.phase === "read" ? "call finish_reading first" : "the table is already ranked",
          );
        const dirs = (S.finish?.directions as Direction[] | undefined) ?? S.map?.directions ?? [];
        // One Jev call for the whole beat and one per direction, all together; each call carries one question per row.
        const overallState = jevState();
        const dirStates = dirs.map((d) => dirState(d));
        const [q, ...perDir] = await Promise.all([
          jev(overallState, Object.fromEntries(TABLE.map((r) => [r.id, ROW_Q(r.id)]))),
          ...dirs.map((d, i) =>
            jev(dirStates[i], Object.fromEntries(TABLE.map((r) => [r.id, DIR_Q(r.id, d)]))),
          ),
        ]);
        const dirScores: Record<string, Record<string, number>> = Object.fromEntries(
          dirs.map((d, i) => [d.label, perDir[i].answers]),
        );
        const linkedHosts = new Map<string, number>();
        for (const p of S.posts.values())
          for (const h of new Set(p.links.map(hostOf)))
            linkedHosts.set(h, (linkedHosts.get(h) ?? 0) + 1);
        const { quoted, mentioned } = theirAccounts();
        const scored = TABLE.map((r) => {
          const score = q.answers[r.id] ?? null;
          const h = hostOf(r.target);
          const linked = [...linkedHosts].find(
            ([lh, n]) => n >= 2 && (lh === h || lh.endsWith(`.${h}`) || h.endsWith(`.${lh}`)),
          );
          const accountHandle = r.kind === "x_account" ? handleOf(r).toLowerCase() : "";
          const evidence =
            accountHandle && quoted.has(accountHandle)
              ? "you quote this account"
              : accountHandle && mentioned.has(accountHandle)
                ? "you mention this account"
                : linked
                  ? `you linked ${linked[0]} ${linked[1]} times`
                  : "";
          return {
            ...r,
            score,
            band:
              score == null
                ? "possible"
                : score >= STRONG
                  ? "strong"
                  : score >= POSSIBLE
                    ? "possible"
                    : "dropped",
            evidence,
          };
        });
        const scoredRows: Pick[] = scored.map((r) => ({ ...r }));
        const picks = fillPicks(
          scoredRows.filter((r) => r.kind !== "x_account"),
          dirs,
          dirScores,
          CAPS.picks,
        );
        const accounts = fillPicks(
          scoredRows.filter((r) => r.kind === "x_account"),
          dirs,
          dirScores,
          TABLE.length,
        );
        const tableGaps = tableGapsOf(dirs, dirScores, TABLE);
        S.rank = {
          picks,
          scores: q.answers,
          direction_scores: dirScores,
          accounts,
          table_gaps: tableGaps,
        };
        S.phase = "gaps";
        const counts = {
          strong: scored.filter((r) => r.band === "strong").length,
          possible: scored.filter((r) => r.band === "possible").length,
          dropped: scored.filter((r) => r.band === "dropped").length,
        };
        const rowTag = (r: Pick) =>
          `<row${attrs({ id: r.id, name: r.name, focus: r.focus, lang: r.lang, for: r.direction, fit: r.direction_score?.toFixed(2), band: r.band, evidence: r.evidence })}>${esc(r.description)}</row>`;
        const seen = [
          `<picks count="${picks.length}">`,
          ...picks.map(rowTag),
          "</picks>",
          `<table_gaps>${esc(tableGaps.join(", ") || `none: every direction has at least ${GAP_STRONG_ROWS} strong table rows`)}</table_gaps>`,
          `<table_accounts count="${accounts.length}">`,
          ...accounts.map(
            (a) =>
              `<account${attrs({ handle: handleOf(a), name: a.name, focus: a.focus, for: a.direction, fit: a.direction_score?.toFixed(2), evidence: a.evidence })}>${esc(a.description)}</account>`,
          ),
          "</table_accounts>",
          `<their_accounts${attrs({ quoted: [...quoted], mentioned: [...mentioned] })}/>`,
          `<linked_sites>${esc([...linkedHosts].map(([h, n]) => `${h} (${n})`).join(", "))}</linked_sites>`,
          `Now phase 4: drops, uncovered directions, check_source on streams you know for each uncovered direction, write_row for each accepted, accounts, then submit.`,
        ].join("\n");
        return {
          seen,
          counts,
          picks,
          accounts,
          table_gaps: tableGaps,
          direction_scores: dirScores,
          all: scored.map((r) => ({
            id: r.id,
            name: r.name,
            focus: r.focus,
            score: r.score,
            band: r.band,
            evidence: r.evidence,
          })),
          jev_ms: q.ms,
          jev_tokens: q.tokens,
          jev_direction_ms: perDir.map((x) => x.ms),
          jev_state: overallState,
          jev_direction_states: dirStates,
          quoted: [...quoted],
          mentioned: [...mentioned],
          linkedHosts: [...linkedHosts],
        };
      }),
      toModelOutput: modelSees,
    }),

    check_source: tool({
      description: fillCaps(
        "Checks one candidate address before it can be added. Use it in phase 4, on every candidate, at most {CHECKS} per build. Pass a candidate address (a publisher's section or public feed you know) and the uncovered direction it would serve, by its label from your final map; code checks that the address is a live recurring stream (a feed with fresh items or a section page listing articles) and that its recent items fit that direction. You get back accepted, with its recent titles and the fit number, or refused, with the reason.",
      ),
      inputSchema: IN_check_source,
      execute: logged("check_source", IN_check_source, async ({ url, direction }) => {
        if (S.phase !== "gaps") return refuse("check_source belongs to phase 4, after rank_table");
        if (S.checks >= CAPS.checks) return refuse(`check cap reached (${CAPS.checks})`);
        const dirs = (S.finish?.directions as Direction[] | undefined) ?? [];
        const label = mapLabel(direction, dirs);
        if (!label)
          return refuse(
            `"${direction}" is not a direction in your final map; use one of: ${dirs.map((d) => d.label).join(", ")}`,
          );
        const key = `${url.trim().replace(/\/+$/, "").toLowerCase()}|${label}`;
        if (S.checkedKeys.has(key))
          return refuse(
            `${url} was already checked for ${label}; check a different address or move on`,
          );
        S.checkedKeys.add(key);
        S.checks += 1;
        // Only a check that ran counts toward submit; a refused call checked nothing (round 7).
        S.checkAttempts += 1;
        const checked = await io.checkSource(url);
        // Feed teasers arrive as HTML (<p>, &nbsp;); Jev, the model and the row writer read them as plain text.
        const c = {
          ...checked,
          sample: checked.sample.map((x) => ({
            ...x,
            title: plainText(x.title),
            teaser: plainText(x.teaser),
          })),
        };
        if (!c.accepted)
          return {
            seen: `<checked${attrs({ url, accepted: "no", reason: c.reason })}/>`,
            check: c,
            direction: label,
          };
        // A live stream is not enough: its recent items must be about the gap it is meant to fill (Kingy's general
        // launch feed was accepted for a video gap before this check existed).
        const d = dirs.find((x) => x.label === label)!;
        const gapState = {
          direction: { label: d.label, concept: d.concept, vocabulary: d.vocabulary },
          stream: {
            url: c.target ?? url,
            items: c.sample.map((x) => ({ title: x.title, teaser: x.teaser })),
          },
        };
        const q = await jevOrNull(gapState, {
          fit: {
            instructions:
              "Do this stream's recent items show that it regularly publishes on the given direction? Judge the items, not the address.",
            criteria: {
              true: "Several of the recent items are about the direction.",
              false: "The items are about other subjects, even neighbouring ones.",
            },
          },
        });
        const fit = q?.answers.fit;
        // A stream is accepted only on a real score at the line. A Jev failure is not the stream's fault, so it gives the check back.
        if (fit == null) {
          S.checks -= 1;
          return refuse("the fit check could not finish; try again");
        }
        if (fit < FIT_LINE)
          return {
            seen: `<checked${attrs({
              url: c.target ?? url,
              accepted: "no",
              fit: fit.toFixed(2),
              reason: `a live stream, but its recent items do not fit ${label} (fit ${fit.toFixed(2)}, the line is ${FIT_LINE}): ${c.sample
                .map((x) => x.title)
                .filter(Boolean)
                .slice(0, 5)
                .join("; ")}`,
            })}/>`,
            check: c,
            direction: label,
            fit,
            jev_state: gapState,
          };
        S.accepted.set(c.target ?? c.url, { ...c, direction: label, fit });
        const seen = `<checked${attrs({ url: c.target ?? url, accepted: "yes", for: label, fit: fit.toFixed(2), reason: c.reason, items_per_week: c.itemsPerWeek })}>\n${c.sample.map((x) => `<item${attrs({ date: x.publishedAt })}>${esc(x.title)}</item>`).join("\n")}\n</checked>`;
        return { seen, check: c, direction: label, fit, jev_state: gapState };
      }),
      toModelOutput: modelSees,
    }),

    write_row: tool({
      description:
        "Adds one accepted address to the monitor and writes its shared-table row. Use it in phase 4, once for each address check_source accepted; the page keeps one row per publisher, so a second address from a publisher that already has an added row is refused. Pass the address exactly as check_source returned it, the uncovered direction it serves and the posts that show that direction; a separate writer model writes the row from what the checker read, and code checks the row's shape. You get back the row (name, focus, language, a description true of the source for anyone); the address is now in the finished monitor, so submit does not list it again.",
      inputSchema: IN_write_row,
      execute: logged("write_row", IN_write_row, async ({ url, direction, post_ids }) => {
        if (S.phase !== "gaps") return refuse("write_row belongs to phase 4");
        const c = S.accepted.get(url) ?? [...S.accepted.values()].find((x) => x.url === url);
        if (!c) return refuse("only an address check_source accepted can get a row");
        if (S.rows.some((r) => r.target === (c.target ?? url)))
          return refuse(`${c.target ?? url} already has a row`);
        if (S.samePublisher.has(c.target ?? url))
          return refuse(
            `${c.target ?? url} was already refused because its publisher has an added row; move on`,
          );
        const dirs = (S.finish?.directions as Direction[] | undefined) ?? [];
        const label = mapLabel(direction, dirs);
        if (!label)
          return refuse(
            `"${direction}" is not a direction in your final map; use one of: ${dirs.map((d) => d.label).join(", ")}`,
          );
        // A row serves the direction its stream was checked against, never one it was not checked for.
        if (label !== c.direction)
          return refuse(
            `${c.target ?? url} was checked for ${c.direction}, not ${label}; pass ${c.direction}`,
          );
        const ids = unitIds(post_ids);
        const bad = ids.filter((id) => !S.posts.has(id));
        if (bad.length) return refuse(`unknown post ids: ${bad.join(", ")}`);
        let w = await io.writeRow(S.rows.length + 1, c);
        if (w.problems.length)
          w = {
            ...(await io.writeRow(S.rows.length + 1, c, w.problems.join("; "))),
            first: w,
          } as any;
        if (w.problems.length)
          return {
            seen: `The writer could not produce a valid row for ${url} (${w.problems.join("; ")}); the address is not added. Move on.`,
            writer: w,
          };
        // One row per publisher among the added rows too, by the same identity the picks use (the row's name).
        const same = S.rows.find(
          (r) => String(r.name ?? "").toLowerCase() === String(w.row.name).toLowerCase(),
        );
        if (same) {
          S.samePublisher.add(c.target ?? url);
          return {
            ...refuse(
              `${c.target ?? url} is published by ${w.row.name}, which already has the added row ${String(same.target)} for ${String(same.direction)}; the page keeps one row per publisher, so this address is not added. Move on`,
            ),
            writer: w,
          };
        }
        const row = {
          ...w.row,
          id: newRowId(w.row.name, w.row.focus),
          kind: c.mechanism === "rss" ? "rss" : "website",
          target: c.target ?? url,
          lang: c.lang ?? w.row.lang,
          itemsPerWeek: c.itemsPerWeek ?? null,
          direction: c.direction,
          post_ids: ids,
          fit: c.fit,
        };
        S.rows.push(row);
        return {
          seen: `<row${attrs({ url: row.target, name: row.name, focus: row.focus, lang: row.lang, for: c.direction })}>${esc(row.description)}</row>`,
          row,
          writer: w,
        };
      }),
      toModelOutput: modelSees,
    }),

    find_accounts: tool({
      description: fillCaps(
        "Finds more X accounts on the beat. Use it in phase 4, once, only when the accounts they quote or cite plus the table's account rows are fewer than {ACCOUNTS}. Pass the beat's main terms joined by OR, words only. You get back the authors of the most relevant public posts of the last month on those terms, each with their bio and one post.",
      ),
      inputSchema: IN_find_accounts,
      execute: logged("find_accounts", IN_find_accounts, async ({ keywords }) => {
        if (S.phase !== "gaps") return refuse("find_accounts belongs to phase 4");
        if (S.findAccountsRan) return refuse("find_accounts runs once");
        if (accountsReached())
          return refuse(
            `the accounts they quote plus the table's rows already reach ${CAPS.accounts}`,
          );
        if (/\b(from|is|has|url|lang|to|conversation_id):/i.test(keywords))
          return refuse("words only: no operators");
        S.findAccountsRan = true;
        const query = `(${keywords}) -is:reply -is:retweet`;
        const { status, body } = await xGet("tweets/search/all", {
          query,
          max_results: "10",
          sort_order: "relevancy",
          start_time: new Date(Date.now() - 30 * 86_400_000).toISOString().replace(/\.\d+Z$/, "Z"),
          ...POST_FIELDS,
          expansions: `${POST_FIELDS.expansions},author_id`,
        });
        if (status !== 200)
          return { seen: `X returned ${status}: ${body.title ?? ""}`, query, body };
        const users = body.includes?.users ?? [];
        const findUsd = xBill(body);
        const byAuthor = new Map<
          string,
          { handle: string; name: string; bio: string; post: string }
        >();
        for (const t of body.data ?? []) {
          const u = users.find((x: any) => x.id === t.author_id);
          if (u && !byAuthor.has(u.username))
            byAuthor.set(u.username, {
              handle: `@${u.username}`,
              name: u.name,
              bio: u.description ?? "",
              post: t.note_tweet?.text ?? t.text,
            });
        }
        for (const a of byAuthor.values()) S.foundHandles.add(a.handle.toLowerCase());
        return {
          seen:
            [...byAuthor.values()]
              .map(
                (a) =>
                  `<author${attrs({ handle: a.handle, name: a.name })}>\n<bio>${esc(a.bio)}</bio>\n<post>${esc(noTco(a.post))}</post>\n</author>`,
              )
              .join("\n") || "no posts found",
          query,
          authors: [...byAuthor.values()],
          x_usd: findUsd,
        };
      }),
      toModelOutput: modelSees,
    }),

    submit: tool({
      description: fillCaps(
        "Submits the finished monitor and ends the build. Call it when phase 4 is done; the sources you added with write_row are already in. Pass the summary, the drops, the uncovered directions, the accounts (at least {ACCOUNTS}, one reason each) and whether the evidence was normal or thin. Code refuses a submission that breaks a rule and says which, so fix it and submit again; an accepted submission ends the build.",
      ),
      inputSchema: IN_submit,
      execute: logged("submit", IN_submit, async (input) => {
        if (S.phase !== "gaps") return refuse("submit comes after rank_table");
        const errs: string[] = [];
        const pickIds = new Set(S.rank?.picks.map((p) => p.id));
        for (const d of input.drops)
          if (!pickIds.has(d.row_id) || !pickIds.has(d.duplicate_of) || d.row_id === d.duplicate_of)
            errs.push(`drop ${d.row_id}: both ids must be different picks`);
        const labels = new Set(
          ((S.finish?.directions as { label: string }[]) ?? []).map((d) => d.label),
        );
        errs.push(...freeTextProblems("the summary", input.summary, SUMMARY_SENTENCES));
        for (const a of input.accounts)
          errs.push(
            ...freeTextProblems(`the reason for ${a.handle ?? a.name}`, a.why, {
              min: REASON_SENTENCES,
              max: REASON_SENTENCES,
            }),
          );
        for (const u of input.uncovered)
          if (!labels.has(u))
            errs.push(`uncovered "${u}" is not a direction label from finish_reading`);
        // The model tends to search the web and submit in the same turn, before the results exist. A table gap
        // needs at least one candidate checked (the check tool appears the turn after the search) before submit.
        if (!submitReady())
          errs.push(
            `the table has gaps (${S.rank!.table_gaps.join(", ")}) and no candidate was checked; call check_source on a candidate first, then submit`,
          );
        if (input.accounts.length < CAPS.accounts && !S.findAccountsRan)
          errs.push(
            `${input.accounts.length} accounts; at least ${CAPS.accounts} are needed, so use the table's rows and then find_accounts`,
          );
        const seenHandles = new Set(input.accounts.map((a) => (a.handle ?? a.name).toLowerCase()));
        if (seenHandles.size < input.accounts.length) errs.push("an account is listed twice");
        if (errs.length) return refuse(errs.join("; "));
        // A direction a source was added for was, by definition, uncovered.
        S.submitted = {
          ...input,
          uncovered: [...new Set([...input.uncovered, ...S.rows.map((r) => String(r.direction))])],
        };
        S.phase = "done";
        return { seen: "Submitted." };
      }),
      toModelOutput: modelSees,
    }),
  };

  const INSTRUCTIONS = fillCaps(INSTRUCTIONS_TEMPLATE);

  // Which tools the model may call this turn: only the current phase's own, so no turn is spent on a call that is
  // refused (round 6: search_posts in phase 4, write_row on the web search turn). In phase 4 the web search is offered
  // until it has been used; check_source from that same turn on, because the provider-run search's results exist only inside
  // that request (store is false) and a model that cannot check them there stalled (Farzan, September 27); write_row only while an accepted address has no row; find_accounts until it has run and only while it would not be
  // refused; submit only when
  // submitReady(). A forced tool is added to the offer where it is forced.
  function activeToolsFor(used: Set<string>): (keyof typeof tools)[] {
    const byPhase: Record<typeof S.phase, (keyof typeof tools)[]> = {
      map: ["map_beat"],
      read: ["search_posts", "read_link", "finish_reading"],
      rank: ["rank_table"],
      gaps: ["check_source", "write_row", "find_accounts", "submit"],
      done: [],
    };
    const gate: Partial<Record<keyof typeof tools, boolean>> = {
      write_row: [...S.accepted.keys()].some(
        (target) => !S.rows.some((r) => r.target === target) && !S.samePublisher.has(target),
      ),
      find_accounts: !S.findAccountsRan && !accountsReached(),
      submit: submitReady(),
    };
    return byPhase[S.phase].filter((t) => gate[t] ?? true);
  }

  let announced: string = "map";
  const PHASE_MESSAGE: Record<string, string> = {
    read: "Searching their posts of the past year",
    rank: "Ranking the shared source table",
    gaps: "Checking gaps, accounts and the summary",
    done: "Done",
  };
  const announce = () => {
    if (S.phase === announced) return;
    announced = S.phase;
    writer.write({
      type: "data-status",
      data: { phase: S.phase, message: PHASE_MESSAGE[S.phase] ?? S.phase },
    });
  };
  const agent = new ToolLoopAgent({
    model: MODEL,
    instructions: INSTRUCTIONS,
    tools,
    reasoning: REASONING,
    maxRetries: 0,
    stopWhen: [() => S.submitted !== null, ({ steps }) => turnBase + steps.length >= MAX_TURNS],
    // Tool choice is "auto", not "required": a model that answers with text instead of a tool call under
    // "required" makes the SDK throw and the whole build is lost (Luna fast did, twice). With "auto" such a
    // turn simply ends this call; the outer loop below nudges the model and continues with the same messages.
    prepareStep: async ({ stepNumber, steps }) => {
      S.step = turnBase + stepNumber;
      announce();
      const used = new Set(
        [...doneSteps, ...steps].flatMap((s) => s.toolCalls.map((c) => c.toolName)),
      );
      const active = activeToolsFor(used);
      const force = (toolName: keyof typeof tools) => ({
        activeTools: [...new Set([...active, toolName])],
        toolChoice: { type: "tool" as const, toolName },
      });
      if (S.step === 0) return force("map_beat");
      if (S.phase === "read" && (S.searches >= CAPS.searches || S.posts.size >= CAPS.posts))
        return force("finish_reading");
      if (S.phase === "rank") return force("rank_table");
      if (S.step >= SUBMIT_TURN) return force("submit");
      return { activeTools: active, toolChoice: "auto" };
    },
  });
  type AgentResult = Awaited<ReturnType<typeof agent.generate>>;
  type AgentStep = AgentResult["steps"][number];
  let turnBase = 0;
  const doneSteps: AgentStep[] = [];

  // ---------- before the loop: the seed, in code ----------
  type Profile = {
    id: string;
    handle: string;
    name: string;
    bio: string;
    location?: string;
    site?: string;
    pinned: Post | null;
    raw: unknown;
  };
  async function seed() {
    const t0 = Date.now();
    const before = S.x_usd;
    const u = await xGet(`users/by/username/${handle}`, {
      "user.fields": USER_FIELDS,
      expansions: "pinned_tweet_id,most_recent_tweet_id,affiliation.user_id",
      "tweet.fields": POST_FIELDS["tweet.fields"],
    });
    const d = u.body.data;
    S.uid = d.id;
    S.billed.add(`u${d.id}`);
    S.x_usd += X_USER;
    xBill({ includes: { tweets: u.body.includes?.tweets ?? [] } });
    const pinnedRaw = (u.body.includes?.tweets ?? []).find((t: any) => t.id === d.pinned_tweet_id);
    const pinned = pinnedRaw
      ? (toPosts({ data: [pinnedRaw], includes: u.body.includes }).posts[0] ?? null)
      : null;
    const site = d.entities?.url?.urls?.[0]?.expanded_url ?? (d.url || undefined);
    const bio = (d.entities?.description?.urls ?? []).reduce(
      (b: string, e: any) => b.replace(e.url, e.expanded_url ?? e.url),
      unX(d.description ?? ""),
    );
    const profile: Profile = {
      id: d.id,
      handle: `@${d.username}`,
      name: d.name,
      bio,
      location: d.location,
      site,
      pinned,
      raw: u.body,
    };
    // The seed is the newest 20 units, a thread being one unit. X fills each timeline page from a short
    // window and then removes replies, so a heavy replier gets short pages and often no next token; the
    // read steps back with until_id until it has 20 units (10 pages at most: an assistant number, unruled).
    const posts: Post[] = [];
    const raw: unknown[] = [];
    const pageCounts: { request: string; returned: number; kept: number }[] = [];
    let token: string | undefined;
    const isUnit = (p: Post, all: Post[]) =>
      p.kind !== "thread_part" || !all.some((q) => q.id === p.conversation_id);
    let untilId: string | undefined;
    for (let page = 0; page < SEED_PAGES; page += 1) {
      const { body } = await xGet(`users/${d.id}/tweets`, {
        max_results: String(SEED_UNITS),
        exclude: "replies,retweets",
        start_time: yearAgo,
        ...POST_FIELDS,
        ...(token ? { pagination_token: token } : untilId ? { until_id: untilId } : {}),
      });
      raw.push(body);
      xBill(body);
      const got = toPosts(body);
      // A post with no words, alt text, quote or link says nothing; it is not a seed unit unless a thread hangs on it.
      const readable = got.posts.filter(
        (p) =>
          p.kind === "thread_part" ||
          got.posts.some((q) => q.conversation_id === p.id && q.id !== p.id) ||
          noTco(p.text) ||
          p.quoted ||
          p.media.some((m) => m.alt) ||
          p.links.length,
      );
      S.textless += got.posts.length - readable.length;
      pageCounts.push({
        request: `timeline page ${page + 1}${token ? " (next page)" : untilId ? ` (older than ${untilId})` : ""}`,
        returned: body.data?.length ?? 0,
        kept: readable.length,
      });
      posts.push(...readable);
      token = body.meta?.next_token;
      untilId = body.meta?.oldest_id;
      if (!body.data?.length || posts.filter((p) => isUnit(p, posts)).length >= SEED_UNITS) break;
    }
    // When the timeline ends short of 20 units (X's timeline reaches only so far back for a heavy replier),
    // one search of their own non-reply posts from the past year, older than anything read so far, fills
    // the gap; the threads it finds are completed like a search's (owner, September 26).
    let fallback = 0;
    let fallbackStatus: number | null = null;
    const have = posts.filter((p) => isUnit(p, posts)).length;
    // An empty timeline (X returned nothing at all) also falls back: the search then runs with no upper time bound.
    if (have < SEED_UNITS) {
      // X refuses until_id together with start_time on search, so "older than the oldest post" is its time.
      const oldest = posts.length
        ? posts.reduce((a, p) => (BigInt(p.id) < BigInt(a.id) ? p : a), posts[0])
        : null;
      const endTime = String(
        (oldest?.raw as { created_at?: string } | undefined)?.created_at ?? "",
      ).replace(/\.\d+Z$/, "Z");
      const { status, body } = await xGet("tweets/search/all", {
        query: `from:${handle} -is:reply -is:retweet`,
        max_results: String(Math.max(10, SEED_UNITS - have)),
        start_time: yearAgo,
        ...(endTime ? { end_time: endTime } : {}),
        ...POST_FIELDS,
      });
      fallbackStatus = status;
      if (status === 200) {
        raw.push(body);
        xBill(body);
        const more = toPosts(body)
          .posts.filter(
            (p) => noTco(p.text) || p.quoted || p.media.some((m) => m.alt) || p.links.length,
          )
          .slice(0, SEED_UNITS - have);
        await completeThreads(more);
        posts.push(...more);
        fallback = more.length;
        pageCounts.push({
          request: `fallback search${endTime ? ` (older than ${endTime.slice(0, 10)})` : ""}`,
          returned: body.data?.length ?? 0,
          kept: more.length,
        });
      }
    }
    const units = posts
      .filter((p) => isUnit(p, posts))
      .sort((a, b) => (BigInt(b.id) > BigInt(a.id) ? 1 : -1))
      .slice(0, SEED_UNITS);
    const keep = new Set(units.map((u) => u.id));
    const seedPosts = posts.filter(
      (p) =>
        keep.has(p.id) ||
        (p.kind === "thread_part" && p.conversation_id && keep.has(p.conversation_id)),
    );
    posts.length = 0;
    posts.push(...seedPosts);
    const cost_usd = usd(S.x_usd - before);
    const pages = raw.length - (fallbackStatus === 200 ? 1 : 0);
    return {
      profile,
      posts,
      count: posts.length,
      cost_usd,
      latency_ms: Date.now() - t0,
      cached: false,
      pages,
      page_counts: pageCounts,
      fallback,
      fallback_status: fallbackStatus,
      raw,
    };
  }
  function firstMessage(profile: Profile, posts: Post[]) {
    return [
      `<beat>${esc(beat)}</beat>`,
      `<profile${attrs({ handle: profile.handle, name: profile.name, location: profile.location, site: profile.site })}>`,
      `<bio>${esc(profile.bio)}</bio>`,
      ...(profile.pinned ? [renderPost(profile.pinned, "pinned_post")] : []),
      "</profile>",
      `<seed_posts count="${posts.length}">`,
      ...posts.map((p) => renderPost(p)),
      "</seed_posts>",
      "Start with map_beat.",
    ].join("\n");
  }

  writer.write({
    type: "data-status",
    data: { phase: "seed", message: `Reading @${handle}'s newest posts` },
  });
  const sd = await seed();
  const seedUnits = addPosts(sd.posts);
  sd.posts = seedUnits;
  sd.count = seedUnits.length;
  const prompt = firstMessage(sd.profile, sd.posts);
  writer.write({
    type: "data-status",
    data: { phase: "map", message: `Read ${sd.count} posts; the model is mapping the beat` },
  });
  let error: string | null = null;
  try {
    // One conversation across calls: a call ends when the model answers without a tool call; the next call
    // carries the same messages plus a plain reminder, until submit is accepted or the turns run out. Every
    // call's stream is merged into the one assistant message the page shows.
    let messages: Parameters<typeof agent.stream>[0] extends { messages?: infer M }
      ? NonNullable<M>
      : never = [{ role: "user", content: prompt }];
    while (S.submitted === null && turnBase < MAX_TURNS) {
      const result = await agent.stream({ messages });
      writer.merge(result.toUIMessageStream({ sendStart: false, sendFinish: false }));
      const steps = await result.steps;
      const response = await result.response;
      doneSteps.push(...steps);
      turnBase = doneSteps.length;
      messages = [...messages, ...response.messages];
      if (S.submitted === null && turnBase < MAX_TURNS)
        messages.push({ role: "user", content: nudgeFor() });
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  function nudgeFor(): string {
    const next =
      S.phase === "map"
        ? "call map_beat"
        : S.phase === "read"
          ? "continue phase 2 (search_posts, read_link) or call finish_reading"
          : S.phase === "rank"
            ? "call rank_table"
            : `phase 4: reading is finished and the table is ranked; ${S.rank?.table_gaps.length ? `check streams you know for ${S.rank.table_gaps.join(", ")} with check_source, then ` : ""}call submit`;
    return `Every turn is one or more tool calls; a text answer does nothing. Now ${next}.`;
  }

  // ---------- after the loop: validate the submission in code ----------
  const submitted = (S.submitted ??
    (S.rank
      ? {
          summary: "",
          drops: [],
          uncovered: S.rows.map((r) => r.direction),
          accounts: S.rank.accounts
            .slice(0, CAPS.accounts)
            .map((r) => ({ handle: handleOf(r), name: r.name, origin: "the table", why: r.focus })),
          evidence: "normal",
          incomplete:
            "no submission was accepted; code assembled the picks and the table's accounts",
        }
      : null)) as any;
  const { quoted: qAcc, mentioned: mAcc } = theirAccounts();
  const removed: string[] = [];
  let final: any = null;
  if (submitted) {
    const norm = (h: string) => `@${h.replace(/^@/, "").toLowerCase()}`;
    const accounts = submitted.accounts.map((a: any) => {
      if (!a.handle) return a;
      const h = norm(a.handle);
      if (
        !qAcc.has(h) &&
        !mAcc.has(h) &&
        !S.foundHandles.has(h) &&
        !S.rank?.accounts.some((r) => handleOf(r).toLowerCase() === h)
      ) {
        removed.push(
          `handle ${h}: not seen in their posts, this build's search or the table; shown as a name only`,
        );
        return { ...a, handle: null };
      }
      return { ...a, handle: h };
    });
    const dropIds = new Set(submitted.drops.map((d: any) => d.row_id));
    const beside = picksBesideAdded(
      S.rank ? S.rank.picks.filter((p) => !dropIds.has(p.id)) : [],
      S.rows,
    );
    removed.push(...beside.removed);
    const picks = beside.picks.slice(0, Math.max(0, CAPS.picks - S.rows.length));
    final = {
      summary: submitted.summary,
      picks: picks.map((p) => ({
        id: p.id,
        name: p.name,
        focus: p.focus,
        lang: p.lang,
        band: p.band,
        score: p.score,
        direction: p.direction,
        direction_score: p.direction_score,
        evidence: p.evidence,
        ticked: isTicked(p),
      })),
      added: S.rows.map((r) => ({
        url: r.target,
        name: r.name,
        focus: r.focus,
        direction: r.direction,
        post_ids: r.post_ids,
        fit: r.fit,
      })),
      newRows: S.rows,
      accounts,
      uncovered: submitted.uncovered,
      drops: submitted.drops,
      evidence: submitted.evidence,
      incomplete: submitted.incomplete ?? null,
      removedByCode: removed,
    };
  }

  announce();
  const dirs = ((S.finish?.directions as Direction[] | undefined) ?? S.map?.directions ?? []).map(
    (d) => ({ label: d.label, concept: d.concept }),
  );
  const targetOf = new Map((S.rank?.picks ?? []).map((p) => [p.id, p.target]));
  const out: Final | null = final
    ? {
        summary: final.summary,
        directions: dirs,
        picks: final.picks.map((p: any) => ({
          id: p.id,
          name: p.name,
          focus: p.focus,
          target: targetOf.get(p.id) ?? "",
          score: p.score,
          band: p.band,
          direction: p.direction ?? null,
          directionScore: p.direction_score ?? null,
        })),
        added: final.added.map((a: any) => ({
          url: a.url,
          name: a.name,
          focus: a.focus,
          direction: a.direction,
          fit: a.fit ?? null,
        })),
        accounts: final.accounts.map((a: any) => ({
          handle: a.handle ?? null,
          name: a.name,
          why: a.why,
        })),
        uncovered: final.uncovered,
      }
    : null;
  const modelUsd = doneSteps.reduce((a, st) => a + costOf(st.providerMetadata), 0);
  writer.write({
    type: "data-result",
    data: {
      final: out,
      costUsd: usd(modelUsd + S.x_usd + S.jev_usd + S.writer_usd),
      turns: doneSteps.length,
      error,
    },
  });
}
