"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Bot, 
  Compass, 
  Bookmark, 
  FileText, 
  Clock, 
  Plus, 
  Search, 
  LogOut, 
  X, 
  Loader2,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, Agent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form states for creating a new agent
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentDesc, setNewAgentDesc] = useState("");
  const [newAgentPrompt, setNewAgentPrompt] = useState("Kamu adalah asisten AI yang ramah dan membantu.");
  const [newAgentModel, setNewAgentModel] = useState("gpt-4o-mini");
  const [newAgentBaseUrl, setNewAgentBaseUrl] = useState("");
  const [newAgentApiKey, setNewAgentApiKey] = useState("");
  const [savingAgent, setSavingAgent] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isAuthPage = pathname === "/login" || pathname === "/register";

  const fetchAgents = async () => {
    if (!user) return;
    setLoadingAgents(true);
    try {
      const data = await api.listAgents();
      setAgents(data);
    } catch (e) {
      console.error("Gagal memuat list agent", e);
    } finally {
      setLoadingAgents(false);
    }
  };

  useEffect(() => {
    if (user && !isAuthPage) {
      fetchAgents();
    }
  }, [user, pathname]);

  // Listen to global updates
  useEffect(() => {
    const handleUpdate = () => {
      fetchAgents();
    };
    window.addEventListener("agents-updated", handleUpdate);
    return () => {
      window.removeEventListener("agents-updated", handleUpdate);
    };
  }, [user]);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;

    setSavingAgent(true);
    setCreateError(null);
    try {
      const created = await api.createAgent({
        name: newAgentName,
        description: newAgentDesc,
        system_prompt: newAgentPrompt,
        model: newAgentModel,
        base_url: newAgentBaseUrl,
        api_key: newAgentApiKey,
      });

      // Clear form
      setNewAgentName("");
      setNewAgentDesc("");
      setNewAgentPrompt("Kamu adalah asisten AI yang ramah dan membantu.");
      setNewAgentModel("gpt-4o-mini");
      setNewAgentBaseUrl("");
      setNewAgentApiKey("");
      setShowCreateModal(false);

      // Trigger updates
      window.dispatchEvent(new Event("agents-updated"));
      
      // Navigate to the new agent's playground
      router.push(`/agents/${created.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Gagal membuat agent baru");
    } finally {
      setSavingAgent(false);
    }
  };

  // Filter & Group Agents
  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    return agents.filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [agents, searchQuery]);

  const groupedAgents = useMemo(() => {
    const now = new Date();
    const today: Agent[] = [];
    const yesterday: Agent[] = [];
    const older: Agent[] = [];

    filteredAgents.forEach((a) => {
      const date = new Date(a.updated_at || a.created_at);
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        today.push(a);
      } else if (diffDays === 1) {
        yesterday.push(a);
      } else {
        older.push(a);
      }
    });

    return { today, yesterday, older };
  }, [filteredAgents]);

  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-violet-600" />
          <p className="mt-2 text-sm text-slate-500 font-medium">Memuat sesi...</p>
        </div>
      </div>
    );
  }

  // If auth page or not logged in, show direct layout without sidebar
  if (isAuthPage || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-violet-50 via-slate-50 to-indigo-50 flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#f4f4f7] overflow-hidden text-slate-800 antialiased">
      {/* SIDEBAR */}
      <aside className="w-[280px] flex flex-col bg-[#f4f4f7] border-r border-slate-200/50 p-5 shrink-0 select-none">
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/25">
              <Bot className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">Cortex</span>
          </Link>
          <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors">
            {/* Sidebar toggle button visual representation */}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-panel-left-close"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
          </button>
        </div>

        {/* New Chat Button */}
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 rounded-xl shadow-sm transition-all active:scale-[0.98] mb-5 text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>New agent</span>
        </button>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search agents..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200/80 rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-all shadow-sm placeholder:text-slate-400"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-1 rounded">⌘K</span>
        </div>

        {/* Static Nav Links */}
        <nav className="space-y-1 mb-6 text-sm font-medium">
          <Link href="/" className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${pathname === "/" ? "bg-white text-slate-900 shadow-sm border border-slate-200/40" : "text-slate-500 hover:bg-slate-200/40 hover:text-slate-800"}`}>
            <Compass className="h-4 w-4 text-violet-500" />
            <span>Explore</span>
          </Link>
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 cursor-not-allowed">
            <Bookmark className="h-4 w-4" />
            <span>Library</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 cursor-not-allowed">
            <FileText className="h-4 w-4" />
            <span>Files</span>
          </div>
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 cursor-not-allowed">
            <Clock className="h-4 w-4" />
            <span>History</span>
          </div>
        </nav>

        {/* Active Agents / Recent Chats */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-2">
          {loadingAgents ? (
            <div className="text-center py-4 text-xs text-slate-400">Loading agents...</div>
          ) : agents.length === 0 ? (
            <div className="text-center py-4 text-xs text-slate-400 italic">No agents created yet</div>
          ) : (
            <>
              {/* Today Group */}
              {groupedAgents.today.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-3 mb-1.5">Hari Ini</div>
                  <div className="space-y-0.5">
                    {groupedAgents.today.map((a) => {
                      const isActive = pathname === `/agents/${a.id}`;
                      return (
                        <Link 
                          key={a.id} 
                          href={`/agents/${a.id}`} 
                          className={`block px-3 py-2 rounded-xl text-xs transition-all truncate ${isActive ? "bg-white border border-slate-200/50 shadow-sm text-violet-600 font-semibold" : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-900"}`}
                        >
                          {a.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Yesterday Group */}
              {groupedAgents.yesterday.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-3 mb-1.5">Kemarin</div>
                  <div className="space-y-0.5">
                    {groupedAgents.yesterday.map((a) => {
                      const isActive = pathname === `/agents/${a.id}`;
                      return (
                        <Link 
                          key={a.id} 
                          href={`/agents/${a.id}`} 
                          className={`block px-3 py-2 rounded-xl text-xs transition-all truncate ${isActive ? "bg-white border border-slate-200/50 shadow-sm text-violet-600 font-semibold" : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-900"}`}
                        >
                          {a.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Older Group */}
              {groupedAgents.older.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase px-3 mb-1.5">7 Hari Terakhir</div>
                  <div className="space-y-0.5">
                    {groupedAgents.older.map((a) => {
                      const isActive = pathname === `/agents/${a.id}`;
                      return (
                        <Link 
                          key={a.id} 
                          href={`/agents/${a.id}`} 
                          className={`block px-3 py-2 rounded-xl text-xs transition-all truncate ${isActive ? "bg-white border border-slate-200/50 shadow-sm text-violet-600 font-semibold" : "text-slate-600 hover:bg-slate-200/40 hover:text-slate-900"}`}
                        >
                          {a.name}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* User profile footer */}
        <div className="border-t border-slate-200/50 pt-4 mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img 
              src="/avatar.png" 
              alt="Avatar" 
              className="h-9 w-9 rounded-full object-cover border border-slate-200 bg-slate-100"
            />
            <div className="min-w-0 leading-tight">
              <p className="text-xs font-semibold text-slate-800 truncate">{user.name || "Emerson Sterling"}</p>
              <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            title="Keluar"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 bg-[#f4f4f7] py-3 pr-3 overflow-hidden flex flex-col">
        <div className="flex-1 bg-white border border-slate-200/30 shadow-[0_4px_30px_rgba(0,0,0,0.02)] rounded-[2.5rem] overflow-hidden flex flex-col relative">
          {children}
        </div>
      </main>

      {/* CREATE AGENT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-250">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Buat Agent Baru</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAgent} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="modal-name" className="text-xs font-semibold text-slate-500">Nama Agent</Label>
                <Input
                  id="modal-name"
                  required
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  placeholder="Misal: Customer Support Bot"
                  className="rounded-xl border-slate-200/80 text-sm focus-visible:ring-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-description" className="text-xs font-semibold text-slate-500">Deskripsi</Label>
                <Input
                  id="modal-description"
                  value={newAgentDesc}
                  onChange={(e) => setNewAgentDesc(e.target.value)}
                  placeholder="Deskripsi singkat agent"
                  className="rounded-xl border-slate-200/80 text-sm focus-visible:ring-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="modal-prompt" className="text-xs font-semibold text-slate-500">System Prompt</Label>
                <Textarea
                  id="modal-prompt"
                  value={newAgentPrompt}
                  onChange={(e) => setNewAgentPrompt(e.target.value)}
                  rows={3}
                  className="rounded-xl border-slate-200/80 text-sm focus-visible:ring-violet-500 resize-none"
                />
                <p className="text-[10px] text-slate-400">
                  Menentukan persona dan instruksi dasar agent.
                </p>
              </div>

              <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div>
                  <p className="text-xs font-bold text-slate-700">Konfigurasi LLM (OpenAI-compatible) — Opsional</p>
                  <p className="text-[10px] text-slate-400">Kosongkan Base URL / API Key untuk memakai default server.</p>
                </div>
                <div className="grid gap-3 grid-cols-3">
                  <div className="space-y-1">
                    <Label htmlFor="modal-model" className="text-[10px] font-semibold text-slate-500">Model</Label>
                    <Input
                      id="modal-model"
                      value={newAgentModel}
                      onChange={(e) => setNewAgentModel(e.target.value)}
                      placeholder="gpt-4o-mini"
                      className="rounded-xl bg-white border-slate-200/80 text-xs py-1 h-8 focus-visible:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="modal-base-url" className="text-[10px] font-semibold text-slate-500">Base URL</Label>
                    <Input
                      id="modal-base-url"
                      value={newAgentBaseUrl}
                      onChange={(e) => setNewAgentBaseUrl(e.target.value)}
                      placeholder="default"
                      className="rounded-xl bg-white border-slate-200/80 text-xs py-1 h-8 focus-visible:ring-violet-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="modal-api-key" className="text-[10px] font-semibold text-slate-500">API Key</Label>
                    <Input
                      id="modal-api-key"
                      type="password"
                      value={newAgentApiKey}
                      onChange={(e) => setNewAgentApiKey(e.target.value)}
                      placeholder="default"
                      className="rounded-xl bg-white border-slate-200/80 text-xs py-1 h-8 focus-visible:ring-violet-500"
                    />
                  </div>
                </div>
              </div>

              {createError && (
                <Alert variant="destructive" className="rounded-xl py-2">
                  <AlertDescription className="text-xs">{createError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl text-xs py-2 px-4 h-9"
                >
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={savingAgent}
                  className="rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-white py-2 px-4 h-9"
                >
                  {savingAgent ? "Menyimpan..." : "Buat Agent"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
