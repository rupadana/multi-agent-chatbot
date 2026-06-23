"use client";

import { useRef, useState } from "react";
import { ChatMessage, Source, streamChat } from "@/lib/api";

interface Turn extends ChatMessage {
  sources?: Source[];
  blocked?: boolean;
  blockReason?: string;
}

export default function Playground({ agentId }: { agentId: number }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;

    setError(null);
    const history: ChatMessage[] = [
      ...turns.map((t) => ({ role: t.role, content: t.content })),
      { role: "user", content: text },
    ];
    setTurns((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setStreaming(true);
    scrollDown();

    await streamChat(agentId, history, {
      onSources: (sources) => {
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = { ...next[next.length - 1], sources };
          return next;
        });
      },
      onDelta: (chunk) => {
        setTurns((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          // Abaikan delta bila pesan sudah diblokir guardrail.
          if (last.blocked) return next;
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
        scrollDown();
      },
      onGuardrail: (stage, message, reason) => {
        setTurns((prev) => {
          const next = [...prev];
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: message,
            blocked: true,
            blockReason: `Guardrail (${stage}): ${reason}`,
          };
          return next;
        });
        scrollDown();
      },
      onError: (msg) => {
        setError(msg);
        setStreaming(false);
      },
      onDone: () => setStreaming(false),
    });
    setStreaming(false);
  };

  const reset = () => {
    setTurns([]);
    setError(null);
  };

  return (
    <div className="flex h-[70vh] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h3 className="font-semibold">Playground</h3>
        <button
          onClick={reset}
          className="text-sm text-slate-500 hover:text-slate-800"
        >
          Reset
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 && (
          <p className="mt-10 text-center text-sm text-slate-400">
            Mulai percakapan untuk menguji agent ini.
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={t.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm " +
                (t.role === "user"
                  ? "bg-indigo-600 text-white"
                  : t.blocked
                    ? "border border-amber-300 bg-amber-50 text-amber-800"
                    : "bg-slate-100 text-slate-800")
              }
            >
              {t.blocked && (
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                  <span>⚠</span> Diblokir oleh guardrail
                </p>
              )}
              <p className="whitespace-pre-wrap">
                {t.content || (streaming && i === turns.length - 1 ? "…" : "")}
              </p>
              {t.sources && t.sources.length > 0 && (
                <div className="mt-2 border-t border-slate-300/50 pt-2">
                  <p className="text-xs font-medium text-slate-500">
                    Sumber knowledge base:
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-slate-500">
                    {t.sources.map((s, j) => (
                      <li key={j}>{s.title}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pesan…"
          disabled={streaming}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 disabled:bg-slate-50"
        />
        <button
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {streaming ? "…" : "Kirim"}
        </button>
      </form>
    </div>
  );
}
