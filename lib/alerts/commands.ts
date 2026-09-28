import "server-only";

import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { createAdminClient } from "@/lib/supabase/admin";

type CommandResult = {
  handled: "activated" | "stop" | "pause" | "resume" | "ignored" | "logged";
  monitorId: string | null;
};

export async function processCommand(input: {
  senderXUserId: string;
  recipientXUserId: string;
  text: string;
}): Promise<CommandResult> {
  const db = createAdminClient();
  const { data: config, error: configError } = await db
    .from("config")
    .select("value")
    .eq("key", "bot")
    .single();
  if (configError) throw configError;
  const bot = z.object({ x_user_id: z.string().regex(/^\d+$/) }).safeParse(config.value);
  if (!bot.success) throw new Error("Bot identity is not configured");
  if (input.senderXUserId === bot.data.x_user_id || input.recipientXUserId !== bot.data.x_user_id) {
    return { handled: "ignored", monitorId: null };
  }

  const text = input.text.trim().toUpperCase();
  const now = new Date().toISOString();
  if (/^[A-Z0-9]{10}$/.test(text)) {
    // Match the owner and consume the still-valid code in the same write.
    const { data: monitor, error } = await db
      .from("monitors")
      .update({
        subscriber_x_user_id: input.senderXUserId,
        bot_state: "active",
        bot_connected_at: now,
        bot_code: null,
        bot_code_expires_at: null,
      })
      .eq("bot_code", text)
      .eq("x_user_id", input.senderXUserId)
      .gt("bot_code_expires_at", now)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!monitor) return { handled: "ignored", monitorId: null };
    track("bot_connected", {}, monitor.id);
    return { handled: "activated", monitorId: monitor.id };
  }

  if (text !== "STOP" && text !== "PAUSE" && text !== "RESUME") {
    return { handled: "logged", monitorId: null };
  }
  const { data: monitor, error: readError } = await db
    .from("monitors")
    .select("id,bot_state")
    .eq("subscriber_x_user_id", input.senderXUserId)
    .maybeSingle();
  if (readError) throw readError;
  if (!monitor) return { handled: "logged", monitorId: null };
  // A stopped subscription needs a new owner code, including after a stray PAUSE.
  if (
    (text === "RESUME" && monitor.bot_state !== "paused") ||
    (text === "PAUSE" && monitor.bot_state === "stopped")
  ) {
    return { handled: "ignored", monitorId: monitor.id };
  }
  const state = text === "STOP" ? "stopped" : text === "PAUSE" ? "paused" : "active";
  const handled = text === "STOP" ? "stop" : text === "PAUSE" ? "pause" : "resume";
  if (monitor.bot_state === state) return { handled, monitorId: monitor.id };
  const { data: updated, error } = await db
    .from("monitors")
    .update({ bot_state: state })
    .eq("id", monitor.id)
    .eq("subscriber_x_user_id", input.senderXUserId)
    .eq("bot_state", monitor.bot_state)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!updated) throw new Error("Alert state changed while processing the command");
  if (text === "STOP") track("bot_stopped", {}, monitor.id);
  if (text === "PAUSE") track("bot_paused", {}, monitor.id);
  return { handled, monitorId: monitor.id };
}
