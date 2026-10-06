import { z } from "zod";

export const setupErrorSchema = z.enum([
  "signed_out",
  "handle_required",
  "invalid_handle",
  "invalid_request",
  "beat_required",
  "beat_too_long",
  "bot",
  "x_identity_invalid",
  "profile_not_found",
  "reserved_handle",
  "identity_mismatch",
  "ownership_conflict",
  "handle_conflict",
  "builds_unavailable",
  "profile_unavailable",
  "build_unavailable",
  "lease_lost",
]);

export type SetupErrorCode = z.infer<typeof setupErrorSchema>;

export const onboardingContent = {
  title: "Set up your agent",
  verifiedBadge: "from your X sign-in",
  handleLabel: "X account",
  handlePlaceholder: "your_handle",
  handleRequired: "Enter the X handle to build around.",
  handleInvalid: "Use 1 to 15 letters, numbers or underscores, with an optional @ at the start.",
  xIdentityUnreadable:
    "We could not read your X account details. Sign out and continue with X again. If this keeps happening, use Contact.",
  signedOut: "Log in to continue setting up your agent.",
  profileNotFoundVerified:
    "We could not find the X account saved by your sign-in. If you changed your handle, sign out and continue with X again.",
  profileUnavailableVerified:
    "We could not check your X account right now. Your agent has not started. Try again.",
  identityMismatchTyped:
    "The account X returned does not match the handle you entered. Check the handle and try again.",
  profileNotFound: (handle: string) =>
    `We could not find @${handle} on X. Check the spelling and try again.`,
  profileNotFoundGeneric: "We could not find that X account. Check the spelling and try again.",
  profileUnavailableGeneric:
    "We could not check that X account right now. Your agent has not started. Try again.",
  profileUnavailable: (handle: string) =>
    `We could not check @${handle} on X right now. Your agent has not started. Try again.`,
  identityMismatch:
    "The account X returned does not match your X sign-in. If you changed your X handle, sign out and continue with X again to refresh it.",
  ownershipConflict:
    "An agent for this X account already exists under another Oparax account. Log in with the account that created it, or use Contact.",
  handleConflict:
    "This page address is already in use. We cannot create an agent for this X handle.",
  refreshHandle: "Sign in with X again to refresh your handle.",
  beatLabel: "What do you want to follow?",
  beatPlaceholder: "The tools and ideas changing how people build with AI",
  beatCount: (count: number) => `${count}/300`,
  beatRequired: "Write a sentence about what you want to follow.",
  beatTooLong: "Keep your beat sentence to 300 characters or fewer.",
  submit: "Build my agent",
  pending: "Preparing your agent…",
  reservedHandle: "This X handle is reserved for an Oparax page. We cannot build an agent for it.",
  buildsUnavailable: "Building is unavailable right now. You can join the waiting list.",
  waitlist: "Join the waiting list",
  saving: "Saving…",
  saved: "You are on the waiting list.",
  waitlistFailed: "We could not save your place. Try again.",
  browserError: "Could not verify this browser. Reload and try again.",
  buildUnavailable: "We could not start your agent. Try again.",
} as const;

export function setupErrorMessage(
  code: SetupErrorCode,
  verified: boolean,
  handle: string | null,
  generic: boolean,
): string {
  switch (code) {
    case "signed_out":
      return onboardingContent.signedOut;
    case "handle_required":
      return onboardingContent.handleRequired;
    case "invalid_handle":
      return onboardingContent.handleInvalid;
    case "beat_required":
      return onboardingContent.beatRequired;
    case "beat_too_long":
      return onboardingContent.beatTooLong;
    case "bot":
      return onboardingContent.browserError;
    case "x_identity_invalid":
      return onboardingContent.xIdentityUnreadable;
    case "reserved_handle":
      return onboardingContent.reservedHandle;
    case "profile_not_found":
      return verified
        ? onboardingContent.profileNotFoundVerified
        : !generic && handle
          ? onboardingContent.profileNotFound(handle)
          : onboardingContent.profileNotFoundGeneric;
    case "profile_unavailable":
      return verified
        ? onboardingContent.profileUnavailableVerified
        : !generic && handle
          ? onboardingContent.profileUnavailable(handle)
          : onboardingContent.profileUnavailableGeneric;
    case "identity_mismatch":
      return verified
        ? onboardingContent.identityMismatch
        : onboardingContent.identityMismatchTyped;
    case "ownership_conflict":
      return onboardingContent.ownershipConflict;
    case "handle_conflict":
      return onboardingContent.handleConflict;
    case "builds_unavailable":
      return onboardingContent.buildsUnavailable;
    case "invalid_request":
    case "build_unavailable":
    case "lease_lost":
      return onboardingContent.buildUnavailable;
  }
}
