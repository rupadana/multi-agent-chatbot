"use client";

import { useState } from "react";
import { Agent, AgentInput, api } from "@/lib/api";

export default function AgentSettings({
  agent,
  onSaved,
}: {
  agent: Agent;
  onSaved: (a: Agent) => void;
}) {
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt);
  const [model, setModel] = useState(agent.model);
  const [baseUrl, setBaseUrl] = useState(agent.base_url ?? "");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    try {
      const data: Partial<AgentInput> = {
        name,
        description,
        system_prompt: systemPrompt,
        model,
        base_url: baseUrl,
      };
      // Hanya kirim api_key bila diubah (kosong = tidak diubah).
      if (apiKey.trim() !== "") data.api_key = apiKey;
      const updated = await api.updateAgent(agent.id, data);
      onSaved(updated);
      setApiKey("");
      setMsg("Tersimpan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Nama</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Deskripsi</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">System Prompt</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
      </div>

      <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-700">
          Konfigurasi LLM (OpenAI-compatible)
        </p>
        <div>
          <label className="mb-1 block text-sm font-medium">Model</label>
          <input
            required
            list="model-suggestions"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <datalist id="model-suggestions">
            <option value="gpt-4o-mini" />
            <option value="gpt-4o" />
            <option value="gpt-4.1-mini" />
            <option value="llama3.1" />
            <option value="qwen2.5" />
            <option value="deepseek-chat" />
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Base URL</label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="Kosongkan untuk pakai default server"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
          <p className="mt-1 text-xs text-slate-400">
            Contoh: https://api.openai.com/v1, https://openrouter.ai/api/v1,
            http://localhost:11434/v1 (Ollama).
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              agent.has_api_key
                ? "•••••••• (tersimpan — isi untuk mengganti)"
                : "Kosongkan untuk pakai default server"
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {msg && <p className="text-sm text-green-600">{msg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={saving}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saving ? "Menyimpan…" : "Simpan Perubahan"}
      </button>
    </form>
  );
}
