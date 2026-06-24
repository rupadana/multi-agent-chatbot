"use client";

import { useRef, useState } from "react";
import { AlertTriangle, RotateCcw, Send } from "lucide-react";
import { ChatMessage, Source, streamChat } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
    <Card className="flex h-[70vh] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold">Playground</h3>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 && (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Mulai percakapan untuk menguji agent ini.
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={t.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                t.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : t.blocked
                    ? "border border-amber-300 bg-amber-50 text-amber-800"
                    : "bg-muted text-foreground"
              )}
            >
              {t.blocked && (
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5" /> Diblokir oleh
                  guardrail
                </p>
              )}
              <p className="whitespace-pre-wrap">
                {t.content || (streaming && i === turns.length - 1 ? "…" : "")}
              </p>
              {t.sources && t.sources.length > 0 && (
                <div className="mt-2 border-t border-border/50 pt-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Sumber knowledge base:
                  </p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
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
        <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={send} className="flex gap-2 border-t p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pesan…"
          disabled={streaming}
        />
        <Button type="submit" disabled={streaming || !input.trim()}>
          <Send className="h-4 w-4" />
          {streaming ? "…" : "Kirim"}
        </Button>
      </form>
    </Card>
  );
}
