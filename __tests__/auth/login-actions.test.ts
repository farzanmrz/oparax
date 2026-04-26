import { describe, it, expect, vi, beforeEach } from "vitest";
import { login } from "@/app/login/actions";

// Mock next/navigation
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

// Mock the Supabase server client
const mockSignInWithPassword = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: (...args: unknown[]) =>
        mockSignInWithPassword(...args),
    },
  }),
}));

function createFormData(email: string, password: string): FormData {
  const formData = new FormData();
  formData.set("email", email);
  formData.set("password", password);
  return formData;
}

describe("login action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /dashboard on successful login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: "123", email: "testuser@oparax.com" },
        session: { access_token: "token" },
      },
      error: null,
    });

    const formData = createFormData("testuser@oparax.com", "testPassword123");

    await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: "testuser@oparax.com",
      password: "testPassword123",
    });
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects with mapped error on invalid credentials", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: "Invalid login credentials",
        status: 400,
      },
    });

    const formData = createFormData("testuser@oparax.com", "wrongPassword");

    await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?error=Invalid%20email%20or%20password."
    );
  });

  it("maps 'Email not confirmed' to generic message (prevents enumeration)", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: "Email not confirmed",
        status: 400,
      },
    });

    const formData = createFormData("testuser@oparax.com", "testPassword123");

    await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?error=Invalid%20email%20or%20password."
    );
  });

  it("redirects with mapped error when rate limited", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        message: "For security purposes, you can only request this after 60 seconds.",
        status: 429,
      },
    });

    const formData = createFormData("testuser@oparax.com", "testPassword123");

    await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/login?error=")
    );
  });

  // Validation edge cases — Supabase should NOT be called

  it("redirects with error when email is missing", async () => {
    const formData = new FormData();
    formData.set("password", "testPassword123");

    await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/login?error=")
    );
  });

  it("redirects with error when password is missing", async () => {
    const formData = new FormData();
    formData.set("email", "test@example.com");

    await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/login?error=")
    );
  });

  it("redirects with error when email has no @ symbol", async () => {
    const formData = createFormData("not-an-email", "testPassword123");

    await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/login?error=")
    );
  });

  it("redirects with error when password is too short", async () => {
    const formData = createFormData("test@example.com", "abc");

    await expect(login(formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/login?error=")
    );
  });
});
