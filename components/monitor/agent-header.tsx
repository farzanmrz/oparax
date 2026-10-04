import Image from "next/image";
import Link from "next/link";
import { cardShadow } from "@/components/monitor/item-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { monitorContent as copy, safeWebUrl } from "@/lib/monitor/content";
import type { Brief, Profile } from "@/lib/monitor/read";

export function ProfileAvatar({ profile }: { profile: Profile | null }) {
  const image = safeWebUrl(profile?.image, true);
  const allowed = image && new URL(image).hostname === "pbs.twimg.com";
  return (
    <Avatar className="size-12">
      {allowed ? (
        <Image
          src={image}
          alt={copy.imageAlt}
          width={48}
          height={48}
          sizes="48px"
          className="size-12 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <AvatarFallback>{profile?.name.slice(0, 1) ?? "@"}</AvatarFallback>
      )}
    </Avatar>
  );
}

export function AgentHeader({
  handle,
  beat,
  profile,
  brief,
  canEdit,
}: {
  handle: string;
  beat: string;
  profile: Profile | null;
  brief: Brief | null;
  canEdit: boolean;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <ProfileAvatar profile={profile} />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="font-heading text-3xl font-normal">{copy.title(handle)}</h1>
          {profile ? <p>{profile.name}</p> : null}
          <p className="text-sm text-muted-foreground">@{handle}</p>
          <p className="text-sm text-muted-foreground">{copy.personalization(handle)}</p>
        </div>
        {canEdit ? (
          <Button variant="outline" asChild className="min-h-11 desk:min-h-6">
            <Link href={`/${handle}/settings`}>{copy.settings}</Link>
          </Button>
        ) : null}
      </div>
      <p className="text-lg">{beat}</p>
      {brief ? (
        <Card className={cardShadow}>
          <CardHeader>
            <h2 className="font-heading text-lg font-semibold">{copy.brief}</h2>
          </CardHeader>
          <CardContent>
            <p className="text-base">{brief.summary}</p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
