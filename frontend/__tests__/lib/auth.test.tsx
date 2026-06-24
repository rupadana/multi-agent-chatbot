import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, renderHook, act, waitFor } from "@testing-library/react";
import React from "react";

// Mock next/navigation BEFORE importing the module under test.
const mockRouter = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => mockRouter }));

import { AuthProvider, useAuth } from "@/lib/auth";

const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const FAKE_USER = { id: 1, email: "a@test.com", name: "Alice", created_at: "2024-01-01" };
const FAKE_TOKEN_RESP = { access_token: "tok-abc", token_type: "bearer", user: FAKE_USER };

function Wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

// ── Initial state without stored token ────────────────────────────────────

describe("AuthProvider — no stored token", () => {
  it("user is null and loading becomes false", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── Token recovery from localStorage ──────────────────────────────────────

describe("AuthProvider — with stored token", () => {
  it("calls /api/auth/me and sets user", async () => {
    localStorage.setItem("mac_token", "valid-tok");
    mockFetch.mockResolvedValueOnce(jsonResponse(FAKE_USER));

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user?.email).toBe("a@test.com");
  });

  it("clears token and sets user to null when /me returns 401", async () => {
    localStorage.setItem("mac_token", "expired-tok");
    mockFetch.mockResolvedValueOnce(new Response("", { status: 401 }));

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("mac_token")).toBeNull();
  });
});

// ── login() ───────────────────────────────────────────────────────────────

describe("login()", () => {
  it("stores token and sets user", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(FAKE_TOKEN_RESP));

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login("a@test.com", "secret");
    });

    expect(result.current.user?.email).toBe("a@test.com");
    expect(localStorage.getItem("mac_token")).toBe("tok-abc");
  });

  it("propagates error on failed login", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ detail: "Email atau password salah." }, 401)
    );

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => result.current.login("a@test.com", "bad"))
    ).rejects.toThrow();
    expect(result.current.user).toBeNull();
  });
});

// ── register() ────────────────────────────────────────────────────────────

describe("register()", () => {
  it("stores token and sets user", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(FAKE_TOKEN_RESP, 201));

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.register("a@test.com", "secret", "Alice");
    });

    expect(result.current.user?.email).toBe("a@test.com");
    expect(localStorage.getItem("mac_token")).toBe("tok-abc");
  });
});

// ── logout() ──────────────────────────────────────────────────────────────

describe("logout()", () => {
  it("clears token, sets user to null, and redirects to /login", async () => {
    localStorage.setItem("mac_token", "valid-tok");
    mockFetch.mockResolvedValueOnce(jsonResponse(FAKE_USER));

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.user).not.toBeNull());

    act(() => result.current.logout());

    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("mac_token")).toBeNull();
    expect(mockRouter.push).toHaveBeenCalledWith("/login");
  });
});

// ── useAuth outside provider ───────────────────────────────────────────────

describe("useAuth outside provider", () => {
  it("throws when used outside <AuthProvider>", () => {
    // Suppress the expected React error log
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow();
    spy.mockRestore();
  });
});
