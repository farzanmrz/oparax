import { describe, it, expect } from "vitest";
import { mapAuthError } from "@/lib/auth-errors";

describe("mapAuthError", () => {
  it("maps 'Invalid login credentials' to generic message", () => {
    expect(mapAuthError("Invalid login credentials")).toBe(
      "Invalid email or password."
    );
  });

  it("maps 'Email not confirmed' to same generic message (prevents enumeration)", () => {
    expect(mapAuthError("Email not confirmed")).toBe(
      "Invalid email or password."
    );
  });

  it("maps 'User already registered' to generic message", () => {
    expect(mapAuthError("User already registered")).toBe(
      "Unable to create account. Please try again or sign in."
    );
  });

  it("maps 'Password should be at least 6 characters'", () => {
    expect(mapAuthError("Password should be at least 6 characters")).toBe(
      "Password must be at least 6 characters."
    );
  });

  it("maps rate limit message", () => {
    expect(
      mapAuthError(
        "For security purposes, you can only request this after 60 seconds."
      )
    ).toBe("Too many attempts. Please wait a moment and try again.");
  });

  it("returns default message for unknown errors", () => {
    expect(mapAuthError("some_internal_error_xyz")).toBe(
      "Something went wrong. Please try again."
    );
  });
});
