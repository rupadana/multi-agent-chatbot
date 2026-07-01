"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Trash2,
  Share2,
  Settings2,
  Database,
  Play,
  X,
  Plug
} from "lucide-react";
import { Agent, api } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";
import AgentSettings from "@/components/AgentSettings";
import KnowledgeBase from "@/components/KnowledgeBase";
import Playground from "@/components/Playground";
import Integrations from "@/components/Integrations";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AgentDetailPage() {
  return (
    <RequireAuth>
      <AgentDetail />
    </RequireAuth>
  );
}

function AgentDetail() {
  const params = useParams();
  const router = useRouter();
  const agentId = Number(params.id);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"playground" | "knowledge" | "integrations" | "settings">("playground");
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Load active agent
    api
      .getAgent(agentId)
      .then(setAgent)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Gagal memuat agent")
      );

    // Load other agents for selector
    api.listAgents()
      .then(setAgents)
      .catch((e) => console.error("Gagal memuat list agent", e));
  }, [agentId]);

  const removeAgent = async () => {
    if (!agent) return;
    if (!confirm("Hapus agent ini beserta knowledge base-nya?")) return;
    try {
      await api.deleteAgent(agent.id);
      window.dispatchEvent(new Event("agents-updated"));
      router.push("/");
    } catch (e) {
      alert("Gagal menghapus agent: " + (e instanceof Error ? e.message : "Unknown error"));
    }
  };

  const handleAgentSelect = (id: number) => {
    setShowDropdown(false);
    router.push(`/agents/${id}`);
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Memuat detail agent…
      </div>
    );
  }

  const sidebarTitle: Record<typeof activeTab, string> = {
    playground: "",
    knowledge: "Knowledge Base",
    integrations: "Integrasi",
    settings: "Settings / Pengaturan",
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* Workspace Header */}
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-3.5 shrink-0 select-none">

        {/* Left: Dropdown Selector & Model */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-50 border border-slate-200/40 rounded-xl transition-all text-sm font-semibold text-slate-800"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{agent.name}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowDropdown(false)} />
              <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl p-1.5 z-40 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2.5 py-1.5">Ganti Agent</div>
                {agents.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => handleAgentSelect(a.id)}
                    className={`flex items-center justify-between w-full text-left px-2.5 py-2 text-xs rounded-xl transition-all ${a.id === agent.id ? "bg-violet-50 text-violet-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}
                  >
                    <span className="truncate">{a.name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-400">{a.model}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Center: Tabs Pills */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/30">
          <button
            onClick={() => setActiveTab("playground")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "playground" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Play className="h-3 w-3" />
            <span>Playground</span>
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "knowledge" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Database className="h-3 w-3" />
            <span>Knowledge Base</span>
          </button>
          <button
            onClick={() => setActiveTab("integrations")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "integrations" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Plug className="h-3 w-3" />
            <span>Integrasi</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === "settings" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Settings2 className="h-3 w-3" />
            <span>Settings</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={removeAgent}
            className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 border border-slate-200/20 rounded-xl transition-all"
            title="Hapus Agent"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Workspace Body */}
      <div className="flex-1 overflow-hidden flex relative bg-white">
        {/* Left/Center: Playground is ALWAYS visible */}
        <div className="flex-1 flex flex-col min-w-0">
          <Playground agentId={agent.id} />
        </div>

        {/* Right: Sidebar Drawer for Knowledge Base, Integrations & Settings */}
        {activeTab !== "playground" && (
          <div className="w-[450px] shrink-0 border-l border-slate-100 flex flex-col h-full bg-slate-50/50 overflow-hidden animate-in slide-in-from-right duration-300">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {sidebarTitle[activeTab]}
              </h3>
              <button
                onClick={() => setActiveTab("playground")}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                title="Tutup Panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Sidebar Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {activeTab === "knowledge" ? (
                <KnowledgeBase agentId={agent.id} />
              ) : activeTab === "integrations" ? (
                <Integrations agentId={agent.id} />
              ) : (
                <AgentSettings agent={agent} onSaved={setAgent} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
