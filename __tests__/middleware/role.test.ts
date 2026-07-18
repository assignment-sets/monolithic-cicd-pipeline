// __tests__/middleware/role.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { requireRole } from "@/middleware/role";

// Mock Clerk backend currentUser
vi.mock("@clerk/nextjs/server", () => ({
  currentUser: vi.fn(),
}));

import { currentUser } from "@clerk/nextjs/server";

describe("requireRole Middleware wrapper", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should return 401 Unauthorized if user is not logged in", async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    const mockHandler = vi.fn().mockResolvedValue(new Response("OK"));
    const protectedHandler = requireRole(["ADMIN"], mockHandler);

    const req = new Request("http://localhost/api/test");
    const response = await protectedHandler(req, { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should return 403 Forbidden if user has no role in metadata", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "user_123",
      publicMetadata: {},
    } as any);

    const mockHandler = vi.fn().mockResolvedValue(new Response("OK"));
    const protectedHandler = requireRole(["ADMIN"], mockHandler);

    const req = new Request("http://localhost/api/test");
    const response = await protectedHandler(req, { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden: insufficient permissions");
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should return 403 Forbidden if user role is not allowed", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "user_123",
      publicMetadata: { role: "STUDENT" },
    } as any);

    const mockHandler = vi.fn().mockResolvedValue(new Response("OK"));
    const protectedHandler = requireRole(["ADMIN"], mockHandler);

    const req = new Request("http://localhost/api/test");
    const response = await protectedHandler(req, { params: Promise.resolve({}) });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden: insufficient permissions");
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it("should call handler if user role is in the allowed list", async () => {
    vi.mocked(currentUser).mockResolvedValue({
      id: "user_123",
      publicMetadata: { role: "ADMIN" },
    } as any);

    const mockHandler = vi.fn().mockResolvedValue(new Response("OK", { status: 200 }));
    const protectedHandler = requireRole(["ADMIN"], mockHandler);

    const req = new Request("http://localhost/api/test");
    const response = await protectedHandler(req, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(mockHandler).toHaveBeenCalled();
  });
});
