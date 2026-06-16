import { redirect } from "next/navigation";

// The login UI now lives in the landing-page auth modal. This route stays as a
// thin redirect so existing links (and the password-reset flow, which sends users
// to /login?message=... or /login?error=...) keep working — it forwards those
// params to the landing page, which auto-opens the login modal and shows them.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}) {
  const { error, message } = await searchParams;

  const params = new URLSearchParams({
    auth: "login",
  });
  if (error) params.set("error", error);
  if (message) params.set("message", message);

  redirect(`/?${params.toString()}`);
}
