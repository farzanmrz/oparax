import { describe, it, expect, vi, beforeEach } from "vitest";
import { updatePassword } from "@/app/auth/reset-password/actions";

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

const mockGetUser = vi.fn();
const mockVerifyOtp = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignOut = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
  }),
}));

function createFormData(
  password?: string,
  confirmPassword?: string,
  tokenHash?: string,
  type?: string
): FormData {
  const formData = new FormData();
  if (password !== undefined) formData.set("password", password);
  if (confirmPassword !== undefined) {
    formData.set("confirm-password", confirmPassword);
  }
  if (tokenHash !== undefined) formData.set("token_hash", tokenHash);
  if (type !== undefined) formData.set("type", type);
  return formData;
}

describe("updatePassword action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates password, signs out, and redirects to login", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "testuser@oparax.com" } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockSignOut.mockResolvedValue({ error: null });

    const formData = createFormData("newPassword123", "newPassword123");

    await expect(updatePassword(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mockGetUser).toHaveBeenCalled();
    expect(mockUpdateUser).toHaveBeenCalledWith({
      password: "newPassword123",
    });
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?message=Password%20updated%20successfully.%20Please%20log%20in."
    );
  });

  it("redirects with validation error when passwords do not match", async () => {
    const formData = createFormData("newPassword123", "differentPassword");

    await expect(updatePassword(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      "/auth/reset-password?error=Passwords%20do%20not%20match."
    );
  });

  it("redirects to login when reset session is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const formData = createFormData("newPassword123", "newPassword123");

    await expect(updatePassword(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?error=Your%20password%20reset%20link%20is%20invalid%20or%20has%20expired.%20Please%20request%20a%20new%20one."
    );
  });

  it("verifies recovery token on submit when session is missing", async () => {
    mockGetUser
      .mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { user: { id: "user-1", email: "testuser@oparax.com" } },
        error: null,
      });
    mockVerifyOtp.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockSignOut.mockResolvedValue({ error: null });

    const formData = createFormData(
      "newPassword123",
      "newPassword123",
      "token-hash-1",
      "recovery"
    );

    await expect(updatePassword(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: "token-hash-1",
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({
      password: "newPassword123",
    });
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?message=Password%20updated%20successfully.%20Please%20log%20in."
    );
  });

  it("redirects to login when recovery token verification fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockVerifyOtp.mockResolvedValue({
      data: null,
      error: { message: "Token has expired or is invalid" },
    });

    const formData = createFormData(
      "newPassword123",
      "newPassword123",
      "expired-token",
      "recovery"
    );

    await expect(updatePassword(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mockUpdateUser).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      "/login?error=Your%20password%20reset%20link%20is%20invalid%20or%20has%20expired.%20Please%20request%20a%20new%20one."
    );
  });

  it("redirects with mapped error when update fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({
      data: { user: null },
      error: {
        message:
          "For security purposes, you can only request this after 60 seconds.",
      },
    });

    const formData = createFormData("newPassword123", "newPassword123");

    await expect(updatePassword(formData)).rejects.toThrow("NEXT_REDIRECT");

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith(
      "/auth/reset-password?error=Too%20many%20attempts.%20Please%20wait%20a%20moment%20and%20try%20again."
    );
  });
});
