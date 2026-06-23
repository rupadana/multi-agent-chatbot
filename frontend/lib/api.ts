export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Agent {
  id: number;
  name: string;
  description: string;
  system_prompt: string;
  model: string;
  created_at: string;
  updated_at: string;
  document_count: number;
}

export interface AgentInput {
  name: string;
  description?: string;
  system_prompt?: string;
  model?: string;
}

export interface KnowledgeDoc {
  id: number;
  agent_id: number;
  title: string;
  content: string;
  created_at: string;
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

export const api = {
  listAgents: () => fetch(`${API_URL}/api/agents`).then((r) => handle<Agent[]>(r)),

  getAgent: (id: number) =>
    fetch(`${API_URL}/api/agents/${id}`).then((r) => handle<Agent>(r)),

  createAgent: (data: AgentInput) =>
    fetch(`${API_URL}/api/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => handle<Agent>(r)),

  updateAgent: (id: number, data: Partial<AgentInput>) =>
    fetch(`${API_URL}/api/agents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => handle<Agent>(r)),

  deleteAgent: (id: number) =>
    fetch(`${API_URL}/api/agents/${id}`, { method: "DELETE" }).then((r) =>
      handle<void>(r)
    ),

  listDocs: (agentId: number) =>
    fetch(`${API_URL}/api/agents/${agentId}/knowledge`).then((r) =>
      handle<KnowledgeDoc[]>(r)
    ),

  addDoc: (agentId: number, data: { title: string; content: string }) =>
    fetch(`${API_URL}/api/agents/${agentId}/knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => handle<KnowledgeDoc>(r)),

  deleteDoc: (agentId: number, docId: number) =>
    fetch(`${API_URL}/api/agents/${agentId}/knowledge/${docId}`, {
      method: "DELETE",
    }).then((r) => handle<void>(r)),
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
    onError?: (message: string) => void;
    onDone?: () => void;
  },
  signal?: AbortSignal
) {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

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
      else if (event === "error") handlers.onError?.(payload.message || "Error");
      else if (event === "done") handlers.onDone?.();
    }
  }
}
