"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Agent } from "@/lib/api";

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setAgents(await api.listAgents());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat agent");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: number) => {
    if (!confirm("Hapus agent ini beserta knowledge base-nya?")) return;
    await api.deleteAgent(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agent Kamu</h1>
          <p className="text-sm text-slate-500">
            Buat banyak agent dengan persona dan knowledge base masing-masing.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {showForm ? "Tutup" : "+ Agent Baru"}
        </button>
      </div>

      {showForm && (
        <CreateAgentForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500">Memuat…</p>
      ) : agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Belum ada agent. Klik <strong>+ Agent Baru</strong> untuk membuat yang
          pertama.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <div
              key={a.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">{a.name}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {a.document_count} dok
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {a.description || "Tanpa deskripsi"}
              </p>
              <p className="mt-2 text-xs text-slate-400">{a.model}</p>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/agents/${a.id}`}
                  className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Buka
                </Link>
                <button
                  onClick={() => remove(a.id)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateAgentForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(
    "Kamu adalah asisten AI yang ramah dan membantu."
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createAgent({
        name,
        description,
        system_prompt: systemPrompt,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Nama Agent</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Misal: Customer Support Bot"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Deskripsi</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi singkat agent"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <p className="mt-1 text-xs text-slate-400">
          Menentukan persona dan instruksi dasar agent.
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Menyimpan…" : "Buat Agent"}
      </button>
    </form>
  );
}
