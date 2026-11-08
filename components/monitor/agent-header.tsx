import { cardShadow } from "@/components/monitor/item-card";
import { ProfileAvatar } from "@/components/one/profile-avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { monitorContent as copy } from "@/lib/monitor/content";
import type { Brief, Profile } from "@/lib/monitor/read";

export function AgentHeader({
  handle,
  beat,
  profile,
  brief,
}: {
  handle: string;
  beat: string;
  profile: Profile | null;
  brief: Brief | null;
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
