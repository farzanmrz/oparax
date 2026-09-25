import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { termsOfService } from "@/lib/legal/content";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: `${termsOfService.title} | Oparax`,
  description: termsOfService.description,
  alternates: { canonical: termsOfService.path },
};

export default async function TermsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return <LegalPage document={termsOfService} signedIn={Boolean(user)} />;
}
