"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Agent, api } from "@/lib/api";
import AgentSettings from "@/components/AgentSettings";
import KnowledgeBase from "@/components/KnowledgeBase";
import Playground from "@/components/Playground";

type Tab = "playground" | "knowledge" | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "playground", label: "Playground" },
  { key: "knowledge", label: "Knowledge Base" },
  { key: "settings", label: "Pengaturan" },
];

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = Number(params.id);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [tab, setTab] = useState<Tab>("playground");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAgent(agentId)
      .then(setAgent)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Gagal memuat agent")
      );
  }, [agentId]);

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!agent) return <p className="text-slate-500">Memuat…</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-indigo-600">
          ← Kembali
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{agent.name}</h1>
        <p className="text-sm text-slate-500">
          {agent.description || "Tanpa deskripsi"} ·{" "}
          <span className="text-slate-400">{agent.model}</span>
        </p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "border-b-2 px-4 py-2 text-sm font-medium " +
              (tab === t.key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "playground" && <Playground agentId={agent.id} />}
      {tab === "knowledge" && <KnowledgeBase agentId={agent.id} />}
      {tab === "settings" && <AgentSettings agent={agent} onSaved={setAgent} />}
    </div>
  );
}
