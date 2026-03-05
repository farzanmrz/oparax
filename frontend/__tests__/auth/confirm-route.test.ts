import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/auth/confirm/route";
import { NextRequest } from "next/server";

const mockVerifyOtp = vi.fn();
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
  }),
}));

function createRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/auth/confirm");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
  });

  it("redirects to /dashboard on successful OTP verification", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: {} }, error: null });

    const request = createRequest({
      token_hash: "abc123",
      type: "email",
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/dashboard");
    expect(location.searchParams.has("token_hash")).toBe(false);
    expect(location.searchParams.has("type")).toBe(false);
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      type: "email",
      token_hash: "abc123",
    });
  });

  it("redirects to /auth/reset-password for recovery links without consuming token", async () => {
    const request = createRequest({
      token_hash: "recovery-token",
      type: "recovery",
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/auth/reset-password");
    expect(location.searchParams.get("token_hash")).toBe("recovery-token");
    expect(location.searchParams.get("type")).toBe("recovery");
    expect(mockVerifyOtp).not.toHaveBeenCalled();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it("redirects to safe next path when provided", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: {} }, error: null });

    const request = createRequest({
      token_hash: "abc123",
      type: "email",
      next: "/dashboard/settings",
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/dashboard/settings");
    expect(location.searchParams.has("next")).toBe(false);
  });

  it("ignores unsafe next values and falls back to defaults", async () => {
    mockVerifyOtp.mockResolvedValue({ data: { user: {} }, error: null });

    const request = createRequest({
      token_hash: "abc123",
      type: "email",
      next: "https://evil.site/phishing",
    });

    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/dashboard");
  });

  it("redirects to / with error when OTP verification fails", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: null,
      error: { message: "Token has expired or is invalid" },
    });

    const request = createRequest({
      token_hash: "expired-token",
      type: "email",
    });

    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("tab")).toBe("signup");
    expect(location.searchParams.get("error")).toContain("confirmation failed");
  });

  it("redirects to /auth/reset-password when recovery token is reused but session exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const request = createRequest({
      type: "recovery",
    });

    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/auth/reset-password");
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("redirects to /forgot-password when recovery token is missing and session is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = createRequest({
      type: "recovery",
    });

    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/forgot-password");
    expect(location.searchParams.get("error")).toContain("invalid or expired");
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("redirects to / with error when token_hash is missing", async () => {
    const request = createRequest({ type: "email" });

    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("tab")).toBe("signup");
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("redirects to / with error when type is missing", async () => {
    const request = createRequest({ token_hash: "abc123" });

    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("tab")).toBe("signup");
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("redirects to / with error when verifyOtp throws (network error)", async () => {
    mockVerifyOtp.mockRejectedValue(new Error("Network timeout"));

    const request = createRequest({
      token_hash: "abc123",
      type: "email",
    });

    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/");
    expect(location.searchParams.get("tab")).toBe("signup");
    expect(location.searchParams.get("error")).toContain("confirmation failed");
  });
});
