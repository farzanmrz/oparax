import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { landingContent } from "@/lib/landing/content";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: landingContent.sharing.title,
  description: landingContent.sharing.description,
  openGraph: {
    title: landingContent.sharing.title,
    description: landingContent.sharing.description,
    siteName: landingContent.brand,
    type: "website",
    url: "/",
  },
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <>
      <PostHogUserContext id={user?.id ?? null} email={user?.email} />
      <LandingPage signedIn={Boolean(user)} />
    </>
  );
}
