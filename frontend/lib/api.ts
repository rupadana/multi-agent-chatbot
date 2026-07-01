export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TOKEN_KEY = "mac_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

/** Gabungkan header default + Authorization bila ada token. */
function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = { ...(extra as Record<string, string>) };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/** Dilempar saat server membalas 401 — dipakai UI untuk redirect ke login. */
export class UnauthorizedError extends Error {
  constructor(message = "Sesi berakhir. Silakan login kembali.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface Agent {
  id: number;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  base_url: string | null;
  has_api_key: boolean;
  guardrails_enabled: boolean;
  guardrail_instructions: string;
  blocked_keywords: string;
  max_input_chars: number;
  refusal_message: string;
  created_at: string;
  updated_at: string;
  document_count: number;
}

export interface AgentInput {
  name: string;
  description?: string;
  system_prompt?: string;
  model?: string;
  base_url?: string;
  api_key?: string;
  guardrails_enabled?: boolean;
  guardrail_instructions?: string;
  blocked_keywords?: string;
  max_input_chars?: number;
  refusal_message?: string;
}

export interface KnowledgeDoc {
  id: number;
  agent_id: number;
  title: string;
  content: string;
  created_at: string;
}

export type IntegrationType = "whatsapp" | "telegram";

export interface Integration {
  id: number;
  agent_id: number;
  type: IntegrationType;
  enabled: boolean;
  provider_url: string;
  session_name: string;
  has_api_key: boolean;
  webhook_path: string;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationInput {
  type: IntegrationType;
  enabled?: boolean;
  provider_url?: string;
  api_key?: string;
  session_name?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Source {
  title: string;
  excerpt: string;
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const auth = {
  register: (data: { email: string; password: string; name?: string }) =>
    fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => handle<{ access_token: string; token_type: string; user: User }>(r)),

  login: (data: { email: string; password: string }) =>
    fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => handle<{ access_token: string; token_type: string; user: User }>(r)),

  me: () =>
    fetch(`${API_URL}/api/auth/me`, { headers: authHeaders() }).then((r) =>
      handle<User>(r)
    ),
};

export const api = {
  listAgents: () =>
    fetch(`${API_URL}/api/agents`, { headers: authHeaders() }).then((r) =>
      handle<Agent[]>(r)
    ),

  getAgent: (id: number) =>
    fetch(`${API_URL}/api/agents/${id}`, { headers: authHeaders() }).then((r) =>
      handle<Agent>(r)
    ),

  createAgent: (data: AgentInput) =>
    fetch(`${API_URL}/api/agents`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    }).then((r) => handle<Agent>(r)),

  updateAgent: (id: number, data: Partial<AgentInput>) =>
    fetch(`${API_URL}/api/agents/${id}`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    }).then((r) => handle<Agent>(r)),

  deleteAgent: (id: number) =>
    fetch(`${API_URL}/api/agents/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then((r) => handle<void>(r)),

  listDocs: (agentId: number) =>
    fetch(`${API_URL}/api/agents/${agentId}/knowledge`, {
      headers: authHeaders(),
    }).then((r) => handle<KnowledgeDoc[]>(r)),

  addDoc: (agentId: number, data: { title: string; content: string }) =>
    fetch(`${API_URL}/api/agents/${agentId}/knowledge`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    }).then((r) => handle<KnowledgeDoc>(r)),

  updateDoc: (agentId: number, docId: number, data: { title: string; content: string }) =>
    fetch(`${API_URL}/api/agents/${agentId}/knowledge/${docId}`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    }).then((r) => handle<KnowledgeDoc>(r)),

  uploadDoc: (agentId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_URL}/api/agents/${agentId}/knowledge/upload`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    }).then((r) => handle<KnowledgeDoc>(r));
  },

  deleteDoc: (agentId: number, docId: number) =>
    fetch(`${API_URL}/api/agents/${agentId}/knowledge/${docId}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then((r) => handle<void>(r)),

  listIntegrations: (agentId: number) =>
    fetch(`${API_URL}/api/agents/${agentId}/integrations`, {
      headers: authHeaders(),
    }).then((r) => handle<Integration[]>(r)),

  createIntegration: (agentId: number, data: IntegrationInput) =>
    fetch(`${API_URL}/api/agents/${agentId}/integrations`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    }).then((r) => handle<Integration>(r)),

  updateIntegration: (id: number, data: Partial<IntegrationInput>) =>
    fetch(`${API_URL}/api/integrations/${id}`, {
      method: "PUT",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(data),
    }).then((r) => handle<Integration>(r)),

  deleteIntegration: (id: number) =>
    fetch(`${API_URL}/api/integrations/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    }).then((r) => handle<void>(r)),

  connectIntegration: (id: number) =>
    fetch(`${API_URL}/api/integrations/${id}/connect`, {
      method: "POST",
      headers: authHeaders(),
    }).then((r) => handle<{ ok: boolean; detail: string }>(r)),
};

/**
 * Streaming chat via Server-Sent Events. Memanggil callback untuk tiap event.
 */
export async function streamChat(
  agentId: number,
  messages: ChatMessage[],
  handlers: {
    onSources?: (sources: Source[]) => void;
    onDelta: (text: string) => void;
    onGuardrail?: (stage: string, message: string, reason: string) => void;
    onError?: (message: string) => void;
    onDone?: () => void;
  },
  signal?: AbortSignal
) {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/chat`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ messages }),
    signal,
  });

  if (res.status === 401) {
    handlers.onError?.("Sesi berakhir. Silakan login kembali.");
    return;
  }

  if (!res.ok || !res.body) {
    const msg = await res.text().catch(() => "Gagal menghubungi server");
    handlers.onError?.(msg || "Gagal menghubungi server");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Pisahkan per blok event (dipisah dua newline).
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      let event = "message";
      let data = "";
      for (const line of part.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) data += line.slice(5).trim();
      }
      if (!data) continue;
      const payload = JSON.parse(data);
      if (event === "sources") handlers.onSources?.(payload.sources || []);
      else if (event === "delta") handlers.onDelta(payload.text || "");
      else if (event === "guardrail")
        handlers.onGuardrail?.(
          payload.stage || "",
          payload.message || "",
          payload.reason || ""
        );
      else if (event === "error") handlers.onError?.(payload.message || "Error");
      else if (event === "done") handlers.onDone?.();
    }
  }
}
