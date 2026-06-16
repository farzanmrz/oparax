import { redirect } from "next/navigation";

// The forgot-password UI now lives in the landing-page auth modal. This route
// stays as a thin redirect so existing links keep working — it forwards any
// error/message params to the landing page, which auto-opens the reset modal.
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
}) {
  const { error, message } = await searchParams;

  const params = new URLSearchParams({
    auth: "forgot",
  });
  if (error) params.set("error", error);
  if (message) params.set("message", message);

  redirect(`/?${params.toString()}`);
}
