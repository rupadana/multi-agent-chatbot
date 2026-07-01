import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getToken,
  setToken,
  UnauthorizedError,
  auth,
  api,
  streamChat,
} from "@/lib/api";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

// Helper: create a successful JSON Response
function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Token helpers ──────────────────────────────────────────────────────────

describe("getToken / setToken", () => {
  it("returns null when nothing stored", () => {
    expect(getToken()).toBeNull();
  });

  it("returns stored token", () => {
    setToken("abc-123");
    expect(getToken()).toBe("abc-123");
  });

  it("removes token when setToken(null)", () => {
    setToken("abc-123");
    setToken(null);
    expect(getToken()).toBeNull();
  });
});

// ── UnauthorizedError ──────────────────────────────────────────────────────

describe("UnauthorizedError", () => {
  it("is an instance of Error", () => {
    expect(new UnauthorizedError()).toBeInstanceOf(Error);
  });

  it("has name UnauthorizedError", () => {
    expect(new UnauthorizedError().name).toBe("UnauthorizedError");
  });

  it("uses default message when none given", () => {
    expect(new UnauthorizedError().message).toMatch(/login kembali/);
  });
});

// ── auth API ──────────────────────────────────────────────────────────────

describe("auth.login", () => {
  it("returns token and user on success", async () => {
    const payload = {
      access_token: "tok",
      token_type: "bearer",
      user: { id: 1, email: "a@test.com", name: "A", created_at: "2024-01-01" },
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(payload));

    const result = await auth.login({ email: "a@test.com", password: "secret" });
    expect(result.access_token).toBe("tok");
    expect(result.user.email).toBe("a@test.com");
  });

  it("throws UnauthorizedError on 401", async () => {
    mockFetch.mockResolvedValueOnce(new Response("", { status: 401 }));
    await expect(auth.login({ email: "x@test.com", password: "bad" })).rejects.toBeInstanceOf(
      UnauthorizedError
    );
  });

  it("throws Error with server detail on 400", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ detail: "Email atau password salah." }, 400)
    );
    await expect(auth.login({ email: "x@test.com", password: "bad" })).rejects.toThrow(
      "Email atau password salah."
    );
  });
});

describe("auth.register", () => {
  it("returns 201 token and user", async () => {
    const payload = {
      access_token: "newtoken",
      token_type: "bearer",
      user: { id: 2, email: "b@test.com", name: "B", created_at: "2024-01-01" },
    };
    mockFetch.mockResolvedValueOnce(jsonResponse(payload, 201));
    const result = await auth.register({
      email: "b@test.com",
      password: "secret1",
      name: "B",
    });
    expect(result.access_token).toBe("newtoken");
  });

  it("throws on duplicate email (409)", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ detail: "Email sudah terdaftar." }, 409)
    );
    await expect(
      auth.register({ email: "dup@test.com", password: "secret1" })
    ).rejects.toThrow("Email sudah terdaftar.");
  });
});

// ── api (agents) — Authorization header ───────────────────────────────────

describe("api.listAgents", () => {
  it("sends Authorization header when token is stored", async () => {
    setToken("my-jwt");
    mockFetch.mockResolvedValueOnce(jsonResponse([]));

    await api.listAgents();

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init?.headers as HeadersInit);
    expect(headers.get("Authorization")).toBe("Bearer my-jwt");
  });

  it("omits Authorization header when no token", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await api.listAgents();

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init?.headers as HeadersInit);
    expect(headers.get("Authorization")).toBeNull();
  });
});

// ── streamChat — SSE parsing ───────────────────────────────────────────────

describe("streamChat", () => {
  function makeStream(lines: string) {
    const encoder = new TextEncoder();
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(lines));
        controller.close();
      },
    });
  }

  it("parses sources, delta, and done events", async () => {
    const sse = [
      'event: sources\ndata: {"sources":[{"title":"Doc","excerpt":"xyz"}]}\n\n',
      'event: delta\ndata: {"text":"Hello"}\n\n',
      'event: delta\ndata: {"text":" world"}\n\n',
      "event: done\ndata: {}\n\n",
    ].join("");

    mockFetch.mockResolvedValueOnce(new Response(makeStream(sse), { status: 200 }));

    const onSources = vi.fn();
    const onDelta = vi.fn();
    const onDone = vi.fn();

    await streamChat(1, [{ role: "user", content: "hi" }], {
      onSources,
      onDelta,
      onDone,
    });

    expect(onSources).toHaveBeenCalledWith([{ title: "Doc", excerpt: "xyz" }]);
    expect(onDelta).toHaveBeenNthCalledWith(1, "Hello");
    expect(onDelta).toHaveBeenNthCalledWith(2, " world");
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("calls onGuardrail on guardrail event", async () => {
    const sse =
      'event: guardrail\ndata: {"stage":"input","message":"Ditolak.","reason":"keyword"}\n\n' +
      "event: done\ndata: {}\n\n";

    mockFetch.mockResolvedValueOnce(new Response(makeStream(sse), { status: 200 }));

    const onGuardrail = vi.fn();
    await streamChat(1, [{ role: "user", content: "rahasia" }], {
      onDelta: vi.fn(),
      onGuardrail,
    });

    expect(onGuardrail).toHaveBeenCalledWith("input", "Ditolak.", "keyword");
  });

  it("calls onError and returns early on 401", async () => {
    mockFetch.mockResolvedValueOnce(new Response("", { status: 401 }));
    const onError = vi.fn();
    await streamChat(1, [{ role: "user", content: "hi" }], {
      onDelta: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalledWith("Sesi berakhir. Silakan login kembali.");
  });

  it("calls onError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Internal Error", { status: 500 }));
    const onError = vi.fn();
    await streamChat(1, [{ role: "user", content: "hi" }], {
      onDelta: vi.fn(),
      onError,
    });
    expect(onError).toHaveBeenCalled();
  });
});
