import "server-only";

import { z } from "zod";
import { track } from "@/lib/analytics/events";
import { createAdminClient } from "@/lib/supabase/admin";

type CommandResult = {
  handled: "activated" | "stop" | "pause" | "resume" | "ignored" | "logged";
  monitorId: string | null;
};

export async function processCommand(input: {
  eventId: string;
  senderXUserId: string;
  recipientXUserId: string;
  recipientMatchesFilter: boolean;
  text: string;
}): Promise<CommandResult> {
  const db = createAdminClient();
  let recipientIsBot = false;
  if (input.recipientMatchesFilter) {
    const { data: config, error: configError } = await db
      .from("config")
      .select("value")
      .eq("key", "bot")
      .single();
    if (configError) throw configError;
    const bot = z.object({ x_user_id: z.string().regex(/^\d+$/) }).safeParse(config.value);
    if (!bot.success) throw new Error("Bot identity is not configured");
    recipientIsBot =
      input.recipientXUserId === bot.data.x_user_id && input.senderXUserId !== bot.data.x_user_id;
  }

  const text = input.text.trim();
  const normalized = text.toUpperCase();
  let command: "start" | "stop" | "pause" | "resume" | "unknown" = "unknown";
  if (recipientIsBot) {
    if (normalized === "STOP") command = "stop";
    else if (normalized === "PAUSE") command = "pause";
    else if (normalized === "RESUME") command = "resume";
    else if (text === "Start alerts") command = "start";
  }

  const { data, error } = await db
    .rpc("apply_bot_command", {
      p_event_id: input.eventId,
      p_sender_x_user_id: input.senderXUserId,
      p_command: command,
    })
    .single();
  if (error) throw error;
  const monitorId = data.monitor_id;
  if (data.changed && monitorId) {
    if (command === "start" || command === "resume") track("bot_connected", {}, monitorId);
    if (command === "stop") track("bot_stopped", {}, monitorId);
    if (command === "pause") track("bot_paused", {}, monitorId);
  }
  return {
    handled: !recipientIsBot
      ? "ignored"
      : monitorId === null
        ? "logged"
        : command === "start"
          ? "activated"
          : command === "unknown"
            ? "ignored"
            : command,
    monitorId,
  };
}
