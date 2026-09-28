"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AtSignIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  HANDLE_NOT_FOUND,
  type OnboardingData,
  type OnboardingUIMessage,
  type PageMedia,
  type PageProfile,
} from "@/lib/onboarding/types";
import { normalizeHandle } from "@/lib/x/handle";

// The five people the lab was tuned on, so each case is one click.
const PEOPLE = [
  { label: "Liam", handle: "ottleyai", beat: "AI developments and practical tools" },
  {
    label: "Nihan",
    handle: "CodebyNihan",
    beat: "New AI tools, product launches and updates worth sharing",
  },
  {
    label: "Reshad",
    handle: "ReshadRahman",
    beat: "FC Barcelona men's first team and football transfer news",
  },
  { label: "Farzan", handle: "farzanmrz", beat: "AI startups and big companies" },
  { label: "Kush", handle: "kushbhuwalka", beat: "AI and tech news" },
];

export function OnboardingClient() {
  const [handle, setHandle] = useState("");
  const [beat, setBeat] = useState("");
  const { messages, sendMessage, status, setMessages, stop, error } = useChat<OnboardingUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/onboarding" }),
  });
  const busy = status === "submitted" || status === "streaming";

  const run = (h: string, b: string) => {
    setMessages([]);
    sendMessage({ text: `@${h}: ${b}` }, { body: { handle: h, beat: b } });
  };

  const parts = messages.flatMap((m) => (m.role === "assistant" ? m.parts : []));
  const statusPart = parts.findLast((p) => p.type === "data-status");
  const resultPart = parts.find((p) => p.type === "data-result");
  const result = resultPart?.type === "data-result" ? resultPart.data : null;
  const notFound = result?.error === HANDLE_NOT_FOUND;
  const profilePart = parts.find((p) => p.type === "data-profile");
  const profile = profilePart?.type === "data-profile" ? profilePart.data : null;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[1356px] flex-col gap-4 px-4 py-4">
      <header className="space-y-3">
        <h1 className="font-heading text-2xl">Onboarding</h1>
        <div className="flex flex-wrap gap-2">
          {PEOPLE.map((p) => (
            <Button
              key={p.handle}
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => {
                setHandle(p.handle);
                setBeat(p.beat);
                run(p.handle, p.beat);
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <form
          className="flex flex-col gap-2 desk:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            if (handle.trim() && beat.trim()) run(normalizeHandle(handle), beat.trim());
          }}
        >
          <div className="flex flex-col gap-1 desk:w-44">
            <Input
              placeholder="X handle"
              aria-invalid={notFound}
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              disabled={busy}
            />
            {notFound ? <p className="text-destructive text-xs">{HANDLE_NOT_FOUND}</p> : null}
          </div>
          <Input
            placeholder="Beat, in one sentence"
            value={beat}
            onChange={(e) => setBeat(e.target.value)}
            disabled={busy}
          />
          {busy ? (
            <Button type="button" variant="secondary" onClick={() => stop()}>
              Stop
            </Button>
          ) : (
            <Button type="submit">Build</Button>
          )}
        </form>
        {error ? <p className="text-destructive text-sm">{error.message}</p> : null}
        {busy && statusPart?.type === "data-status" && (
          <Shimmer className="text-muted-foreground text-sm">{statusPart.data.message}</Shimmer>
        )}
      </header>

      {busy || profile || notFound ? (
        <ChainOfThought defaultOpen>
          <ChainOfThoughtHeader>Onboarding steps</ChainOfThoughtHeader>
          <ChainOfThoughtContent>
            <ProfileStep handle={handle} profile={profile} notFound={notFound} />
          </ChainOfThoughtContent>
        </ChainOfThought>
      ) : null}

      <Conversation className="rounded-md border">
        <ConversationContent>
          {messages.map((m) => (
            <Message key={m.id} from={m.role}>
              <MessageContent className="w-full">
                {m.parts.map((part, i) => {
                  const key = `${m.id}-${i}`;
                  if (part.type === "text")
                    return <MessageResponse key={key}>{part.text}</MessageResponse>;
                  if (part.type === "data-status")
                    return (
                      <p key={key} className="font-mono text-muted-foreground text-xs">
                        {part.data.message}
                      </p>
                    );
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {result && <Result result={result} />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    </main>
  );
}

// Micro-step 1: looking the person up on X, then what was found.
function ProfileStep({
  handle,
  profile,
  notFound,
}: {
  handle: string;
  profile: PageProfile | null;
  notFound: boolean;
}) {
  if (notFound)
    return (
      <ChainOfThoughtStep
        icon={AtSignIcon}
        label={`No X account for @${handle}`}
        description={HANDLE_NOT_FOUND}
        status="complete"
      />
    );
  if (!profile)
    return (
      <ChainOfThoughtStep icon={AtSignIcon} label={`Looking up @${handle} on X`} status="active" />
    );
  const pin = profile.pinned;
  return (
    <ChainOfThoughtStep
      icon={AtSignIcon}
      label={
        <span className="flex items-center gap-2">
          {profile.image ? (
            <Image
              src={profile.image}
              alt=""
              width={24}
              height={24}
              className="size-6 rounded-full"
            />
          ) : null}
          Found {profile.name} ({profile.handle}) on X
        </span>
      }
      status="complete"
    >
      <div className="space-y-2 text-foreground">
        {profile.bio ? <p className="whitespace-pre-wrap">{profile.bio}</p> : null}
        <p className="text-muted-foreground">{profile.site ?? "No website"}</p>
        {pin ? (
          <div className="space-y-2 rounded-md border p-3">
            <p className="text-muted-foreground text-xs">Pinned post</p>
            <p className="whitespace-pre-wrap">{pin.text}</p>
            {pin.links.map((l) => (
              <p key={l} className="break-all text-primary text-xs">
                {l}
              </p>
            ))}
            <Pictures media={pin.media} />
            {pin.quoted ? (
              <div className="space-y-2 border-l-2 pl-3 text-muted-foreground">
                <p className="text-xs">Quotes {pin.quoted.author}</p>
                <p className="whitespace-pre-wrap">{pin.quoted.text}</p>
                <Pictures media={pin.quoted.media} />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground">No pinned post</p>
        )}
      </div>
    </ChainOfThoughtStep>
  );
}

const PICTURE_LABEL: Record<string, string> = {
  photo: "photo",
  video: "video, its freeze frame",
  animated_gif: "GIF, its freeze frame",
};

// A post's pictures as the model receives them: a photo itself, a video or GIF by its freeze frame.
function Pictures({ media }: { media: PageMedia[] }) {
  if (!media.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {media.map((m, i) => (
        <figure key={m.src ?? i} className="w-40 space-y-1">
          {m.src ? (
            <Image
              src={m.src}
              alt={m.alt ?? PICTURE_LABEL[m.type] ?? m.type}
              width={160}
              height={112}
              className="h-28 w-40 rounded-md object-cover"
            />
          ) : null}
          <figcaption className="text-muted-foreground text-xs">
            {PICTURE_LABEL[m.type] ?? `${m.type}, no picture`}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

function Result({ result }: { result: OnboardingData["result"] }) {
  const f = result.final;
  return (
    <section className="space-y-4 rounded-md border p-4 text-sm">
      <p className="font-mono text-muted-foreground text-xs">
        {result.turns} model calls, ${result.costUsd.toFixed(3)}
        {result.error ? `, error: ${result.error}` : ""}
      </p>
      {f && (
        <>
          <div>
            <h2 className="font-heading font-semibold">Sites and feeds</h2>
            <ul className="mt-1 space-y-1">
              {f.sites.map((s) => (
                <li key={s.id}>
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground"> ({s.score.toFixed(2)})</span>, {s.focus}
                  <span className="text-muted-foreground">: {s.why}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-heading font-semibold">X accounts, not monitored yet</h2>
            <ul className="mt-1 space-y-1">
              {f.accounts.map((a) => (
                <li key={a.handle}>
                  <span className="font-mono">{a.handle}</span>
                  <span className="text-muted-foreground"> ({a.score.toFixed(2)})</span>
                  <span className="text-muted-foreground">: {a.why}</span>
                </li>
              ))}
            </ul>
          </div>
          {f.searched && <p className="text-muted-foreground">Searched X: {f.searched}</p>}
        </>
      )}
    </section>
  );
}
