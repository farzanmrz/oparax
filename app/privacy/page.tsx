import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { privacyPolicy } from "@/lib/legal/content";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${privacyPolicy.title} | Oparax`,
  description: privacyPolicy.description,
  alternates: { canonical: privacyPolicy.path },
};

export default async function PrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <LegalPage document={privacyPolicy} signedIn={Boolean(user)} />;
}
