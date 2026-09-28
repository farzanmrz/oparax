"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  type AuthFormState,
  emailSigninLink,
  loginAction,
  signInWithProvider,
} from "@/lib/auth/actions";
import { authContent } from "@/lib/auth/content";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, isPending] = useActionState<AuthFormState, FormData>(loginAction, {});
  const [linkState, linkAction, linkPending] = useActionState(emailSigninLink, {});
  const [googleState, googleAction, googlePending] = useActionState(
    signInWithProvider.bind(null, "google", next),
    {},
  );
  const [twitterState, twitterAction, twitterPending] = useActionState(
    signInWithProvider.bind(null, "twitter", next),
    {},
  );
  return (
    <div className="space-y-4">
      <form
        action={linkState.message ? "/api/auth/link" : linkAction}
        method={linkState.message ? "post" : undefined}
        className="space-y-4"
      >
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="space-y-1.5">
          <label htmlFor="link-email" className="block text-sm font-medium">
            {authContent.email}
          </label>
          <Input
            id="link-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={linkState.email}
            placeholder={authContent.emailPlaceholder}
            className="min-h-11 desk:min-h-7"
            aria-describedby="link-status"
          />
        </div>
        <p id="link-status" role={linkState.error ? "alert" : "status"} className="text-sm">
          {linkState.error ?? linkState.message}
        </p>
        <Button className="min-h-11 w-full desk:min-h-7" disabled={linkPending}>
          {linkPending
            ? authContent.sending
            : linkState.message
              ? authContent.resend
              : authContent.magicLink}
        </Button>
      </form>
      <Separator />
      <form action={googleAction} className="space-y-2">
        <Button variant="outline" className="min-h-11 w-full desk:min-h-7" disabled={googlePending}>
          {authContent.google}
        </Button>
        {googleState.error && <p role="alert">{googleState.error}</p>}
      </form>
      <form action={twitterAction} className="space-y-2">
        <Button
          variant="outline"
          className="min-h-11 w-full desk:min-h-7"
          disabled={twitterPending}
        >
          {authContent.twitter}
        </Button>
        {twitterState.error && <p role="alert">{twitterState.error}</p>}
      </form>
      <Separator />
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium">
            {authContent.email}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            placeholder={authContent.emailPlaceholder}
            className="min-h-11 desk:min-h-7"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium">
            {authContent.password}
          </label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="min-h-11 desk:min-h-7"
          />
        </div>
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <Button type="submit" className="min-h-11 w-full desk:min-h-7" disabled={isPending}>
          {isPending ? (
            <>
              <Spinner />
              {authContent.loggingIn}
            </>
          ) : (
            authContent.login
          )}
        </Button>
      </form>
    </div>
  );
}
