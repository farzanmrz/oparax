import type { Metadata } from "next";
import { type LandingEntrance, LandingPage } from "@/components/landing/landing-page";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { readAuthContext } from "@/lib/auth/identity";
import { landingContent } from "@/lib/landing/content";

export const metadata: Metadata = {
  openGraph: {
    title: landingContent.sharing.title,
    description: landingContent.sharing.description,
    siteName: landingContent.brand,
    type: "website",
    url: "/",
  },
};

export default async function RootPage() {
  const { user, monitor } = await readAuthContext();
  const entrance: LandingEntrance = !user
    ? { kind: "signed_out" }
    : monitor
      ? { kind: "owner", handle: monitor.handle }
      : { kind: "setup" };

  return (
    <>
      <PostHogUserContext id={user?.id ?? null} email={user?.email} />
      <LandingPage signedIn={Boolean(user)} entrance={entrance} />
    </>
  );
}
