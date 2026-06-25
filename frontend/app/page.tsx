"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Bot, 
  Sparkles, 
  Search, 
  ArrowRight,
  Brain,
  MessageSquare,
  FileSearch,
  Plus
} from "lucide-react";
import { api, Agent } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";

export default function HomePage() {
  return (
    <RequireAuth>
      <HomeContent />
    </RequireAuth>
  );
}

function HomeContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [promptInput, setPromptInput] = useState("");

  useEffect(() => {
    api.listAgents()
      .then(setAgents)
      .catch((e) => console.error("Gagal memuat list agent", e))
      .finally(() => setLoading(false));
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = promptInput.trim();
    if (!query) return;

    if (agents.length === 0) {
      alert("Silakan buat agent baru terlebih dahulu melalui tombol di sidebar!");
      return;
    }

    // Redirect to the first agent's playground and auto-send prompt
    const firstAgentId = agents[0].id;
    router.push(`/agents/${firstAgentId}?initial_prompt=${encodeURIComponent(query)}`);
  };

  const handleCardClick = (agentId: number) => {
    router.push(`/agents/${agentId}`);
  };

  const getFirstName = (fullName?: string) => {
    if (!fullName) return "User";
    return fullName.split(" ")[0];
  };

  // Preset prompts to display when no agents exist
  const sampleSuggestions = [
    {
      icon: <Brain className="h-5 w-5 text-violet-500" />,
      title: "Synthesize Data",
      desc: "Turn raw research notes or document details into clear takeaways."
    },
    {
      icon: <Sparkles className="h-5 w-5 text-violet-500" />,
      title: "Creative Brainstorm",
      desc: "Generate copy, slogans, or conceptual themes for your projects."
    },
    {
      icon: <FileSearch className="h-5 w-5 text-violet-500" />,
      title: "Check Facts",
      desc: "Ask questions based on your loaded knowledge base documents."
    }
  ];

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto px-6 py-12 md:px-12 select-none">
      {/* Top Header Placeholder spacing */}
      <div className="h-4" />

      {/* Main Center Area */}
      <div className="max-w-2xl w-full mx-auto flex flex-col items-center text-center space-y-6">
        
        {/* Glassmorphic Orb */}
        <div className="relative flex items-center justify-center py-4">
          <div className="w-28 h-28 rounded-full glass-orb animate-orb" />
          {/* Subtle reflection overlay */}
          <div className="absolute top-[25%] left-[25%] w-8 h-4 bg-white/40 rounded-full rotate-[-30deg] blur-[0.5px]" />
        </div>

        {/* Greetings */}
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-semibold text-violet-500">Hello, {getFirstName(user?.name)}</h2>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-none">
            How can I assist you today?
          </h1>
        </div>

        {/* Chat / Search box */}
        <form onSubmit={handleSearchSubmit} className="w-full bg-[#f8f9fa] border border-slate-200/60 rounded-3xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.015)] space-y-2 mt-4">
          <div className="flex items-center gap-2.5 px-2">
            <textarea
              rows={2}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder={agents.length > 0 ? "Ask me anything..." : "Buat agent terlebih dahulu untuk mulai bertanya..."}
              className="flex-1 bg-transparent border-0 text-slate-800 focus:outline-none resize-none placeholder:text-slate-400 text-sm py-1.5"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSearchSubmit(e);
                }
              }}
            />
          </div>
          
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 px-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 px-2 py-1 bg-white border border-slate-100 rounded-lg flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-violet-500" />
                <span>RAG Retrieval</span>
              </span>
            </div>
            
            <button 
              type="submit" 
              disabled={!promptInput.trim()} 
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-full p-2 disabled:bg-slate-200 disabled:text-slate-400 transition-all flex items-center justify-center"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Suggestion Cards at the Bottom */}
      <div className="max-w-3xl w-full mx-auto mt-12 grid gap-4 sm:grid-cols-3">
        {loading ? (
          <div className="col-span-3 text-center text-xs text-slate-400">Loading agents...</div>
        ) : agents.length === 0 ? (
          // If no agents exist, show sample suggestions
          sampleSuggestions.map((item, idx) => (
            <div 
              key={idx} 
              className="bg-white border border-slate-200/50 hover:border-violet-300 p-5 rounded-2xl transition-all text-left group shadow-[0_2px_12px_rgba(0,0,0,0.01)]"
            >
              <div className="mb-3.5 p-2 bg-violet-50 rounded-xl w-fit group-hover:scale-105 transition-all">
                {item.icon}
              </div>
              <h3 className="text-xs font-bold text-slate-800 mb-1">{item.title}</h3>
              <p className="text-[11px] text-slate-400 leading-normal">{item.desc}</p>
            </div>
          ))
        ) : (
          // If agents exist, show up to 3 agents as cards
          agents.slice(0, 3).map((agent) => (
            <div 
              key={agent.id} 
              onClick={() => handleCardClick(agent.id)}
              className="bg-white border border-slate-200/50 hover:border-violet-400 p-5 rounded-2xl cursor-pointer transition-all text-left group shadow-[0_2px_12px_rgba(0,0,0,0.01)] hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="mb-3.5 p-2 bg-violet-50 rounded-xl w-fit text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-800 mb-1 truncate">{agent.name}</h3>
              <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                {agent.description || `Uji playground dan knowledge base untuk agent ${agent.name}.`}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Footer Text */}
      <div className="text-center text-[10px] text-slate-400 mt-12 flex items-center justify-center gap-1.5">
        <span>Hubungkan & kustomisasi AI Agent sesukamu.</span>
      </div>
    </div>
  );
}
