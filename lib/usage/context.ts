import { AsyncLocalStorage } from "node:async_hooks";

export interface UsageContext {
  userId?: string | null;
  sessionId?: string | null;
  messageId?: string | null;
  toolCallId?: string | null;
  toolName?: string | null;
}

const storage = new AsyncLocalStorage<UsageContext>();

/** Run `fn` with an attribution context that logUsage() will auto-merge. Nested calls inherit. */
export function withUsageContext<T>(ctx: UsageContext, fn: () => T): T {
  return storage.run({ ...currentUsageContext(), ...ctx }, fn);
}

export function currentUsageContext(): UsageContext {
  return storage.getStore() ?? {};
}
