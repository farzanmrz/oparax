import { describe, it, expect, vi, beforeEach } from "vitest";
import { signup } from "@/app/signup/actions";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

// Mock the Supabase server client
const mockSignUp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
    },
  }),
}));

function createFormData(email: string, password: string, confirmPassword?: string): FormData {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  formData.set("confirm-password", confirmPassword ?? password);
  return formData;
}

describe("signup action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /signup/check-email on successful signup", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "123", email: "testuser@oparax.com", identities: [{ id: "abc" }] }, session: null },
      error: null,
    });

    const formData = createFormData("testuser@oparax.com", "testPassword123");

    await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSignUp).toHaveBeenCalledWith({
      email: "testuser@oparax.com",
      password: "testPassword123",
    });
    expect(mockRedirect).toHaveBeenCalledWith("/signup/check-email");
  });

  it("redirects with mapped error on weak password", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: "Password should be at least 6 characters",
        code: "weak_password",
        status: 422,
      },
    });

    const formData = createFormData("testuser@oparax.com", "short");

    await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/signup?error=Password%20must%20be%20at%20least%206%20characters."
    );
  });

  it("redirects with mapped error on invalid email format", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: "Unable to validate email address: invalid format",
        code: "validation_failed",
        status: 400,
      },
    });

    const formData = createFormData("not-an-email", "testPassword123");

    await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/signup?error=")
    );
  });

  it("redirects with mapped error when rate limited", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: "For security purposes, you can only request this after 60 seconds.",
        code: "over_request_rate_limit",
        status: 429,
      },
    });

    const formData = createFormData("testuser@oparax.com", "testPassword123");

    await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/signup?error=")
    );
  });

  it("redirects with default error on unexpected server failure", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: "An unexpected error occurred",
        code: "unexpected_failure",
        status: 500,
      },
    });

    const formData = createFormData("testuser@oparax.com", "testPassword123");

    await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/signup?error=")
    );
  });

  it("maps 'User already registered' to generic message (prevents enumeration)", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: "User already registered",
        code: "user_already_exists",
        status: 422,
      },
    });

    const formData = createFormData("existing@example.com", "testPassword123");

    await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining(
        encodeURIComponent("Unable to create account. Please try again or sign in.")
      )
    );
  });

  it("detects duplicate email via empty identities (Supabase anti-enumeration)", async () => {
    mockSignUp.mockResolvedValue({
      data: { user: { id: "fake-id", email: "existing@example.com", identities: [] }, session: null },
      error: null,
    });

    const formData = createFormData("existing@example.com", "testPassword123");

    await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining(
        encodeURIComponent("An account with this email already exists. Please sign in instead.")
      )
    );
  });

  // Validation edge cases — Supabase should NOT be called

  it("redirects with error when email is missing", async () => {
    const formData = new FormData();
    formData.set("password", "testPassword123");

    await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/signup?error=")
    );
  });

  it("redirects with error when password is missing", async () => {
    const formData = new FormData();
    formData.set("email", "test@example.com");

    await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/signup?error=")
    );
  });

  it("redirects with error when email has no @ symbol", async () => {
    const formData = createFormData("not-an-email", "testPassword123");

    await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/signup?error=")
    );
  });

  it("redirects with error when password is too short", async () => {
    const formData = createFormData("test@example.com", "abc");

    await expect(signup(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSignUp).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/signup?error=")
    );
  });
});
