import { describe, it, expect, beforeEach, vi } from "vitest";
import { api, setToken, Integration } from "@/lib/api";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SAMPLE: Integration = {
  id: 1,
  agent_id: 5,
  type: "telegram",
  enabled: true,
  provider_url: "",
  session_name: "default",
  has_api_key: true,
  webhook_path: "/api/integrations/webhook/abc",
  webhook_url: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

describe("api.listIntegrations", () => {
  it("requests the agent's integrations with auth header", async () => {
    setToken("jwt");
    mockFetch.mockResolvedValueOnce(jsonResponse([SAMPLE]));

    const result = await api.listIntegrations(5);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/agents\/5\/integrations$/);
    const headers = new Headers(init?.headers as HeadersInit);
    expect(headers.get("Authorization")).toBe("Bearer jwt");
    expect(result).toHaveLength(1);
  });
});

describe("api.createIntegration", () => {
  it("POSTs the integration payload", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(SAMPLE, 201));

    await api.createIntegration(5, { type: "telegram", api_key: "tok" });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/agents\/5\/integrations$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({
      type: "telegram",
      api_key: "tok",
    });
  });
});

describe("api.updateIntegration", () => {
  it("PUTs to /api/integrations/:id", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ ...SAMPLE, enabled: false }));

    const result = await api.updateIntegration(1, { enabled: false });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/integrations\/1$/);
    expect(init.method).toBe("PUT");
    expect(result.enabled).toBe(false);
  });
});

describe("api.deleteIntegration", () => {
  it("DELETEs the integration", async () => {
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await api.deleteIntegration(1);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/integrations\/1$/);
    expect(init.method).toBe("DELETE");
  });
});

describe("api.connectIntegration", () => {
  it("POSTs to the connect endpoint and returns result", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ ok: true, detail: "Webhook terpasang." })
    );

    const result = await api.connectIntegration(1);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/integrations\/1\/connect$/);
    expect(init.method).toBe("POST");
    expect(result.ok).toBe(true);
    expect(result.detail).toMatch(/Webhook/);
  });

  it("propagates the server error detail on failure", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ detail: "PUBLIC_BASE_URL belum diset" }, 400)
    );
    await expect(api.connectIntegration(1)).rejects.toThrow(/PUBLIC_BASE_URL/);
  });
});
