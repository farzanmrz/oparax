import { describe, it, expect, vi, beforeEach } from "vitest";
import { requestPasswordReset } from "@/app/forgot-password/actions";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockHeadersGet = vi.fn();
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: (key: string) => mockHeadersGet(key),
  }),
}));

const mockResetPasswordForEmail = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      resetPasswordForEmail: (...args: unknown[]) =>
        mockResetPasswordForEmail(...args),
    },
  }),
}));

function createFormData(email?: string): FormData {
  const formData = new FormData();
  if (email !== undefined) {
    formData.set("email", email);
  }
  return formData;
}

describe("requestPasswordReset action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHeadersGet.mockImplementation((key: string) => {
      if (key === "origin") return "https://app.oparax.com";
      return null;
    });
  });

  it("requests reset email and redirects with a generic success message", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    });

    const formData = createFormData("testuser@oparax.com");

    await expect(requestPasswordReset(formData)).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      "testuser@oparax.com",
      {
        redirectTo: "https://app.oparax.com/auth/reset-password",
      }
    );
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/forgot-password?message=")
    );
  });

  it("redirects with validation error when email is missing", async () => {
    const formData = createFormData();

    await expect(requestPasswordReset(formData)).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      expect.stringContaining("/forgot-password?error=")
    );
  });

  it("redirects with mapped error when Supabase rejects the request", async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      data: null,
      error: {
        message:
          "For security purposes, you can only request this after 60 seconds.",
      },
    });

    const formData = createFormData("testuser@oparax.com");

    await expect(requestPasswordReset(formData)).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockRedirect).toHaveBeenCalledWith(
      "/forgot-password?error=Too%20many%20attempts.%20Please%20wait%20a%20moment%20and%20try%20again."
    );
  });

  it("falls back to forwarded host when request origin is unavailable", async () => {
    mockHeadersGet.mockImplementation((key: string) => {
      if (key === "origin") return null;
      if (key === "x-forwarded-host") return "secure.oparax.com";
      if (key === "x-forwarded-proto") return "https";
      return null;
    });

    mockResetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    });

    const formData = createFormData("testuser@oparax.com");

    await expect(requestPasswordReset(formData)).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      "testuser@oparax.com",
      {
        redirectTo: "https://secure.oparax.com/auth/reset-password",
      }
    );
  });
});
