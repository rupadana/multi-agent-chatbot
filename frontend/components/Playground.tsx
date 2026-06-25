"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { 
  AlertTriangle, 
  RotateCcw, 
  Send, 
  Sparkles, 
  Paperclip, 
  Image, 
  Lightbulb, 
  Cpu, 
  Globe, 
  Mic,
  ArrowRight,
  Database,
  Brain,
  FileSearch,
  Bot
} from "lucide-react";
import { ChatMessage, Source, streamChat, api, Agent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface Turn extends ChatMessage {
  sources?: Source[];
  blocked?: boolean;
  blockReason?: string;
}

export default function Playground({ agentId }: { agentId: number }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.getAgent(agentId).then(setAgent).catch(console.error);
  }, [agentId]);

  const scrollDown = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  };

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
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

    // Auto-expand/shrink textarea back to default
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses jawaban.");
      setStreaming(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  // Check for initial prompt query param
  useEffect(() => {
    const initialPrompt = searchParams.get("initial_prompt");
    if (initialPrompt && agent) {
      handleSend(initialPrompt);
      // Clean query parameters from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("initial_prompt");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, agent]);

  const reset = () => {
    setTurns([]);
    setError(null);
  };

  const getFirstName = (fullName?: string) => {
    if (!fullName) return "User";
    return fullName.split(" ")[0];
  };

  // Suggestion card prompts specific to the active agent
  const suggestions = [
    {
      icon: <Brain className="h-4 w-4 text-violet-500" />,
      title: "Synthesize Data",
      prompt: "Tolong rangkum info paling penting dari dokumen knowledge base-mu."
    },
    {
      icon: <Sparkles className="h-4 w-4 text-violet-500" />,
      title: "Creative Brainstorm",
      prompt: "Bantu aku membuat ide kreatif baru berdasarkan system prompt kamu."
    },
    {
      icon: <FileSearch className="h-4 w-4 text-violet-500" />,
      title: "Check Facts",
      prompt: "Apakah kamu memiliki data pendukung di knowledge base-mu? Jelaskan."
    }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full bg-white select-none">
      
      {/* Chat scroll area */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scroll-smooth"
      >
        {turns.length === 0 ? (
          /* Landing state inside chat area (mockup style) */
          <div className="max-w-2xl w-full mx-auto flex flex-col items-center text-center space-y-6 py-12">
            
            {/* Center glowing orb */}
            <div className="relative flex items-center justify-center py-2">
              <div className="w-24 h-24 rounded-full glass-orb animate-orb" />
              <div className="absolute top-[25%] left-[25%] w-6 h-3 bg-white/40 rounded-full rotate-[-30deg] blur-[0.5px]" />
            </div>

            {/* Greetings */}
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-violet-500">Hello, {getFirstName(user?.name)}</h2>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-none">
                How can I assist you today?
              </h1>
            </div>

            {/* Suggestions cards */}
            <div className="w-full grid gap-3 sm:grid-cols-3 pt-6">
              {suggestions.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleSend(item.prompt)}
                  className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200/50 p-4 rounded-2xl cursor-pointer transition-all text-left group shadow-[0_2px_8px_rgba(0,0,0,0.005)]"
                >
                  <div className="mb-2.5 p-1.5 bg-white rounded-lg w-fit shadow-sm border border-slate-100 group-hover:scale-105 transition-all">
                    {item.icon}
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 mb-1">{item.title}</h3>
                  <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                    {item.prompt}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Actual turns history */
          <div className="max-w-2xl w-full mx-auto space-y-6">
            {turns.map((t, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  t.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {t.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-violet-100 border border-violet-200/40 text-violet-600 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                
                <div className="max-w-[85%] space-y-2">
                  <div
                    className={cn(
                      "px-4 py-3 text-sm rounded-2xl leading-relaxed shadow-[0_2px_8px_rgba(0,0,0,0.005)]",
                      t.role === "user"
                        ? "bg-slate-100 text-slate-800 rounded-tr-sm"
                        : t.blocked
                          ? "border border-amber-300 bg-amber-50/70 text-amber-800 rounded-tl-sm"
                          : "bg-white border border-slate-100 text-slate-800 rounded-tl-sm"
                    )}
                  >
                    {t.blocked && (
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-600">
                        <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                        <span>⚠ Diblokir oleh guardrail</span>
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">
                      {t.content || (streaming && i === turns.length - 1 ? "…" : "")}
                    </p>
                  </div>

                  {/* Knowledge base references */}
                  {t.sources && t.sources.length > 0 && (
                    <div className="mt-1 ml-1 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        <span>Sumber RAG:</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {t.sources.map((s, j) => (
                          <div 
                            key={j} 
                            className="text-[10px] bg-slate-50 border border-slate-200/50 hover:border-slate-300 rounded-lg px-2 py-1 text-slate-500 font-medium transition-all"
                            title={s.excerpt}
                          >
                            {s.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {t.role === "user" && (
                  <img 
                    src="/avatar.png"
                    alt="User"
                    className="h-8 w-8 rounded-full border border-slate-200 object-cover shrink-0"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error alert */}
      {error && (
        <div className="max-w-2xl w-full mx-auto px-6 py-2">
          <div className="border border-destructive/20 bg-destructive/5 rounded-xl px-4 py-2.5 text-xs text-destructive flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-destructive font-bold hover:underline">X</button>
          </div>
        </div>
      )}

      {/* Chat Form Area */}
      <div className="border-t border-slate-100 px-6 py-4 shrink-0 bg-white">
        <form onSubmit={onSubmit} className="max-w-2xl w-full mx-auto bg-slate-50 border border-slate-200/60 rounded-3xl p-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.01)] space-y-2">
          
          {/* Main textarea */}
          <div className="flex items-center gap-2 px-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto height adjustment
                if (textareaRef.current) {
                  textareaRef.current.style.height = "auto";
                  textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                }
              }}
              placeholder="Ask me anything..."
              disabled={streaming}
              className="flex-1 bg-transparent border-0 text-slate-800 focus:outline-none resize-none placeholder:text-slate-400 text-xs py-1.5 max-h-[120px] overflow-y-auto"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmit(e);
                }
              }}
            />
          </div>
          
          {/* Tools & Submit bottom bar */}
          <div className="flex items-center justify-between border-t border-slate-200/40 pt-2 px-1">
            
            {/* Left aligned options */}
            <div className="flex items-center gap-1">
              {/* Deeper Research pill */}
              <button 
                type="button"
                className="text-[10px] text-violet-600 bg-violet-50 border border-violet-100 hover:bg-violet-100 rounded-lg px-2.5 py-1 font-semibold flex items-center gap-1 transition-all"
                title="RAG Retrieval otomatis aktif."
              >
                <Sparkles className="h-3 w-3" />
                <span>RAG Retrieval</span>
              </button>

              {/* Extra icons */}
              <button type="button" className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors" title="Upload Image (Visual)">
                <Image className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors" title="Insights">
                <Lightbulb className="h-3.5 w-3.5" />
              </button>
            </div>
            
            {/* Right aligned options */}
            <div className="flex items-center gap-1">
              <button type="button" className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors" title="System Model">
                <Cpu className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors" title="Web Search">
                <Globe className="h-3.5 w-3.5" />
              </button>
              <button type="button" className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors" title="Voice Input">
                <Mic className="h-3.5 w-3.5" />
              </button>

              {/* Send / Clear Button */}
              {turns.length > 0 && (
                <button 
                  type="button"
                  onClick={reset}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-200 transition-colors mr-1"
                  title="Clear Chat"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}

              <button 
                type="submit" 
                disabled={streaming || !input.trim()} 
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-full p-2 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center justify-center shadow-sm active:scale-95"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

    </div>
  );
}
