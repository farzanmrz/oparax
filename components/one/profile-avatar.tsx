import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { monitorContent as copy, safeWebUrl } from "@/lib/monitor/content";
import type { Profile } from "@/lib/monitor/read";

/** The person's Twitter picture when it is Twitter's own (pbs.twimg.com), else their initial. */
export function ProfileAvatar({
  profile,
  size = 48,
}: {
  profile: Pick<Profile, "name" | "image"> | null;
  size?: number;
}) {
  const image = safeWebUrl(profile?.image, true);
  const allowed = image && new URL(image).hostname === "pbs.twimg.com";
  return (
    <Avatar className="shrink-0" style={{ width: size, height: size }}>
      {allowed ? (
        <Image
          src={image}
          alt={copy.imageAlt}
          width={size}
          height={size}
          sizes={`${size}px`}
          className="rounded-full object-cover"
          style={{ width: size, height: size }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <AvatarFallback>{profile?.name.slice(0, 1) ?? "@"}</AvatarFallback>
      )}
    </Avatar>
  );
}
