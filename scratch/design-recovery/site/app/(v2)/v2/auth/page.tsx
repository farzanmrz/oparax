import { AuthCard } from "@/v2/shared/auth-card";

export const metadata = { title: "Oparax | Log in or sign up" };

// One card for log in and sign up: "Sign up" reveals the confirm-password field in place.
export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return (
    <div className="palette-council relative grid min-h-svh place-items-center overflow-hidden px-4 py-16">
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--stage-light)" }} />
      <div className="relative w-full max-w-[400px]">
        <AuthCard initial={mode === "signup" ? "signup" : "login"} />
      </div>
    </div>
  );
}
