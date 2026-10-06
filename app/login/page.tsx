import { redirect } from "next/navigation";
import { AuthStage, OneAuthCard } from "@/components/auth/one-card";
import { PostHogUserContext } from "@/components/posthog-user-context";
import { signedInDestination } from "@/lib/auth/oauth";
import { createClient } from "@/lib/supabase/server";
import { safeAuthDestination } from "@/lib/validation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error, message, next } = await searchParams;
  if (user) redirect(await signedInDestination(next));

  return (
    <>
      <PostHogUserContext id={null} email={undefined} />
      <AuthStage fan>
        <OneAuthCard
          initial="login"
          next={safeAuthDestination(next) ?? undefined}
          error={error}
          message={message}
        />
      </AuthStage>
    </>
  );
}
