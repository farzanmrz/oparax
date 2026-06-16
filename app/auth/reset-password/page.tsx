import { redirect } from "next/navigation";

// The set-new-password UI now lives in the landing-page reset modal. This
// route stays as a thin redirect so existing links (and any old recovery
// emails pointing here) keep working — it forwards the one-time token and
// any error params to the landing page, which auto-opens the reset modal.
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    token_hash?: string;
    type?: string;
  }>;
}) {
  const { error, token_hash, type } = await searchParams;

  const params = new URLSearchParams({
    auth: "reset",
  });
  if (token_hash) params.set("token_hash", token_hash);
  if (type) params.set("type", type);
  if (error) params.set("error", error);

  redirect(`/?${params.toString()}`);
}
