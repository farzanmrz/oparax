import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-sm text-muted-foreground">
          We sent you a confirmation link. Please check your email and click the
          link to activate your account.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-medium underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
