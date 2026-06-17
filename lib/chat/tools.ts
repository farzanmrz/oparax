import { tool } from "ai";
import { z } from "zod";
import { discoverHandles, discoverSites } from "@/lib/chat/discover";
import { validateSites } from "@/lib/sites/validate";
import { withUsageContext } from "@/lib/usage/context";
import { logUsage } from "@/lib/usage/log";
import { fetchExampleTweets } from "@/lib/x/syndication";
import { fetchRecentPosts } from "@/lib/x/timeline";
import { verifyHandles } from "@/lib/x/verify";

// Identity of the user's connected X account, threaded into request-scoped tools
// (fetchMyRecentPosts) so the model can pull THEIR posts without re-auth.
export interface XConnectionContext {
  connected: boolean;
  username: string | null;
  /** Stored X user id (preferred); resolved from username when absent. */
  xUserId?: string | null;
  /** The user's fresh OAuth access token (server-only). Enables protected reads. */
  accessToken?: string | null;
}

// ---------------------------------------------------------------------------
// Deep-partial schema for setAgentConfig
//
// Every field — including nested ones — is made optional so the model can call
// this tool with partial updates (incremental config filling). We build it
// by hand rather than using z.deepPartial() (not in zod v3 public API) so
// TypeScript resolves the type correctly.
// ---------------------------------------------------------------------------
const setAgentConfigInputSchema = z.object({
  name: z.string().min(1).optional(),
  scanningInstructions: z.string().optional(),
  draftingInstructions: z.string().optional(),
  exampleTweets: z
    .array(
      z.object({
        url: z.string(),
        text: z.string(),
      }),
    )
    .optional(),
  sources: z
    .object({
      x: z
        .object({
          enabled: z.boolean().optional(),
          handles: z.array(z.string()).optional(),
        })
        .optional(),
      web: z
        .object({
          enabled: z.boolean().optional(),
          preferredDomains: z.array(z.string()).optional(),
        })
        .optional(),
    })
    .optional(),
  schedule: z
    .object({
      cadenceMinutes: z.number().int().min(60).nullable().optional(),
      daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
      windowStart: z.string().nullable().optional(),
      windowEnd: z.string().nullable().optional(),
      timezone: z.string().optional(),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

/**
 * CLIENT tool — no `execute`. The React layer intercepts this via `onToolCall`
 * and merges the patch into the local config state, then calls `addToolResult`.
 */
const setAgentConfig = tool({
  description: "Set or update fields of the agent config as the user provides them.",
  inputSchema: setAgentConfigInputSchema,
  // No execute — resolved on the client side.
});

const verifyHandlesTool = tool({
  description:
    "Verify that a list of X (Twitter) handles exist and are public. Call this as soon as the user provides handles.",
  inputSchema: z.object({
    handles: z.array(z.string()),
  }),
  // Run inside a tool-call context so verifyHandles' internal logUsage(x_verify)
  // gets attributed to this tool call (and the request's user/session).
  execute: async (input, { toolCallId }) =>
    withUsageContext({ toolCallId, toolName: "verifyHandles" }, () => verifyHandles(input.handles)),
});

const validateSitesTool = tool({
  description:
    "Check that a list of web domains are reachable and readable (not paywalled). Call this when the user provides preferred domains for web monitoring.",
  inputSchema: z.object({
    domains: z.array(z.string()),
  }),
  execute: async (input, { toolCallId }) =>
    withUsageContext({ toolCallId, toolName: "validateSites" }, async () => {
      const results = await validateSites(input.domains);
      // web_validate is a free internal op (HEAD fetches only) — log quantity for
      // the cost-attribution drill-down; cost resolves to $0 in the engine.
      await logUsage({
        kind: "web_validate",
        provider: "internal",
        tool_name: "validateSites",
        metadata: { checked: input.domains.length },
      });
      return results;
    }),
});

const discoverHandlesTool = tool({
  description:
    "Find REAL, currently-active X accounts to follow for a beat/topic. You MUST call this whenever you suggest handles — never propose handles from your own knowledge. Returns unverified candidates; verify them with verifyHandles before presenting.",
  inputSchema: z.object({
    topic: z.string().describe("The reporter's beat/topic in plain language"),
  }),
  execute: async (input, { toolCallId }) =>
    withUsageContext({ toolCallId, toolName: "discoverHandles" }, async () => ({
      handles: await discoverHandles(input.topic),
    })),
});

const discoverSitesTool = tool({
  description:
    "Find REAL, reputable news sites to monitor for a beat/topic. You MUST call this whenever you suggest sites — never propose domains from your own knowledge. Returns unvalidated candidates; validate them with validateSites before presenting.",
  inputSchema: z.object({
    topic: z.string().describe("The reporter's beat/topic in plain language"),
  }),
  execute: async (input, { toolCallId }) =>
    withUsageContext({ toolCallId, toolName: "discoverSites" }, async () => ({
      sites: await discoverSites(input.topic),
    })),
});

/**
 * SERVER tool factory — `fetchExampleTweets`. Closes over the connected user's
 * OAuth token so a pasted tweet URL from a protected account they FOLLOW resolves
 * (tweet.read sees everything the user can view). Falls back to the app bearer /
 * syndication for public reads when no token is present. Non-throwing.
 */
export function buildFetchExampleTweetsTool(xConnection: XConnectionContext | undefined) {
  return tool({
    description:
      "Fetch the text of example tweets by URL so they can be stored as drafting style references. Call this when the user provides X/Twitter post URLs as voice examples.",
    inputSchema: z.object({
      urls: z.array(z.string()),
    }),
    execute: async (input) => fetchExampleTweets(input.urls, xConnection?.accessToken ?? null),
  });
}

/**
 * SERVER tool factory — `fetchMyRecentPosts`. Closes over the connected user's
 * X identity (passed in by buildAgentChatStream) so the model can pull THEIR
 * recent posts as voice examples without asking them to re-authorize. Returns
 * `{ ok, posts, username }`; when X isn't connected the tool short-circuits with
 * a not-connected result rather than reaching the API. Always non-throwing.
 *
 * @param xConnection - the request's X-connection context (or null/disconnected)
 * @returns the AI-SDK tool
 */
export function buildFetchMyRecentPostsTool(xConnection: XConnectionContext | undefined) {
  return tool({
    description:
      "Fetch the connected user's own recent X posts to use as voice/style examples. Call this at the voice step when the user wants to pull from their recent posts (their X account is already connected).",
    // No input — whose posts to fetch is fixed by the connected account.
    inputSchema: z.object({}),
    execute: async () => {
      if (!xConnection?.connected) {
        return {
          ok: false as const,
          posts: [] as string[],
          username: null,
          error: "No X account is connected.",
        };
      }
      return fetchRecentPosts({
        xUserId: xConnection.xUserId ?? null,
        username: xConnection.username,
        accessToken: xConnection.accessToken ?? null,
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Exported tool map
// ---------------------------------------------------------------------------

export const configTools = {
  setAgentConfig,
  verifyHandles: verifyHandlesTool,
  validateSites: validateSitesTool,
  discoverHandles: discoverHandlesTool,
  discoverSites: discoverSitesTool,
};
