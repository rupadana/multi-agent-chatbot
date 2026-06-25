"use client";

import { useState } from "react";
import { Agent, AgentInput, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings, ShieldAlert, Cpu, CheckCircle } from "lucide-react";

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
  // Guardrails
  const [grEnabled, setGrEnabled] = useState(agent.guardrails_enabled);
  const [grInstructions, setGrInstructions] = useState(
    agent.guardrail_instructions
  );
  const [blockedKeywords, setBlockedKeywords] = useState(agent.blocked_keywords);
  const [maxInputChars, setMaxInputChars] = useState(agent.max_input_chars);
  const [refusalMessage, setRefusalMessage] = useState(agent.refusal_message);
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
        guardrails_enabled: grEnabled,
        guardrail_instructions: grInstructions,
        blocked_keywords: blockedKeywords,
        max_input_chars: maxInputChars,
        refusal_message: refusalMessage,
      };
      if (apiKey.trim() !== "") data.api_key = apiKey;
      
      const updated = await api.updateAgent(agent.id, data);
      onSaved(updated);
      setApiKey("");
      setMsg("Semua perubahan berhasil disimpan.");

      // Dispatch global updates to sidebar
      window.dispatchEvent(new Event("agents-updated"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-4xl mx-auto space-y-6 pb-12 text-slate-800">
      
      {/* Alert Banner for Status */}
      {msg && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 py-3.5">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-xs font-semibold">{msg}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
          {/* General Config Card */}
          <Card className="rounded-3xl border border-slate-200/50 shadow-[0_4px_24px_rgba(0,0,0,0.005)]">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Settings className="h-4 w-4 text-violet-500" />
                <span>Pengaturan Umum</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-name" className="text-xs font-semibold text-slate-500">Nama Agent</Label>
                <Input
                  id="s-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border-slate-200 focus-visible:ring-violet-500 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-desc" className="text-xs font-semibold text-slate-500">Deskripsi Singkat</Label>
                <Input
                  id="s-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl border-slate-200 focus-visible:ring-violet-500 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-prompt" className="text-xs font-semibold text-slate-500">System Prompt</Label>
                <Textarea
                  id="s-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={5}
                  className="rounded-xl border-slate-200 focus-visible:ring-violet-500 text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* LLM Credentials Card */}
          <Card className="rounded-3xl border border-slate-200/50 shadow-[0_4px_24px_rgba(0,0,0,0.005)]">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Cpu className="h-4 w-4 text-violet-500" />
                <span>Konfigurasi LLM</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="s-model" className="text-xs font-semibold text-slate-500">Model Name</Label>
                <Input
                  id="s-model"
                  required
                  list="model-suggestions"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                  className="rounded-xl border-slate-200 focus-visible:ring-violet-500 text-sm"
                />
                <datalist id="model-suggestions">
                  <option value="gpt-4o-mini" />
                  <option value="gpt-4o" />
                  <option value="llama3.1" />
                  <option value="qwen2.5" />
                  <option value="deepseek-chat" />
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-baseurl" className="text-xs font-semibold text-slate-500">Base URL (API Endpoint)</Label>
                <Input
                  id="s-baseurl"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="Kosongkan untuk pakai default server"
                  className="rounded-xl border-slate-200 focus-visible:ring-violet-500 text-sm"
                />
                <p className="text-[10px] text-slate-400">
                  Contoh: https://api.openai.com/v1, https://openrouter.ai/api/v1
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="s-apikey" className="text-xs font-semibold text-slate-500">Custom API Key</Label>
                <Input
                  id="s-apikey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    agent.has_api_key
                      ? "•••••••• (Tersimpan — isi untuk mengganti)"
                      : "Kosongkan untuk pakai default server"
                  }
                  className="rounded-xl border-slate-200 focus-visible:ring-violet-500 text-sm"
                />
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-3xl border border-slate-200/50 shadow-[0_4px_24px_rgba(0,0,0,0.005)]">
            <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-violet-500" />
                <span>Pengaturan Guardrails</span>
              </CardTitle>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={grEnabled}
                  onChange={(e) => setGrEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aktif</span>
              </label>
            </CardHeader>
            <CardContent className="pt-4">
              {!grEnabled ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Guardrails dinonaktifkan. Centang opsi &quot;Aktif&quot; di atas untuk mengatur instruksi pembatasan topik, kata terlarang, atau batas panjang input.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="gr-instructions" className="text-xs font-semibold text-slate-500">Aturan &amp; Batasan Topik</Label>
                    <Textarea
                      id="gr-instructions"
                      value={grInstructions}
                      onChange={(e) => setGrInstructions(e.target.value)}
                      rows={3}
                      placeholder="Mis: Hanya jawab seputar produk toko. Tolak pertanyaan medis, hukum, atau di luar topik."
                      className="rounded-xl border-slate-200 focus-visible:ring-violet-500 text-sm resize-none"
                    />
                    <p className="text-[10px] text-slate-400">
                      Instruksi ini akan digabungkan secara paksa ke system prompt.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gr-keywords" className="text-xs font-semibold text-slate-500">Kata/Frasa Terlarang</Label>
                    <Textarea
                      id="gr-keywords"
                      value={blockedKeywords}
                      onChange={(e) => setBlockedKeywords(e.target.value)}
                      rows={3}
                      placeholder="Pisahkan per baris atau koma. Contoh: harga agen sebelah, kompetitor, kasar."
                      className="rounded-xl border-slate-200 focus-visible:ring-violet-500 text-sm resize-none"
                    />
                    <p className="text-[10px] text-slate-400">
                      Kata terlarang akan secara otomatis disensor pada input pengguna maupun output model.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="gr-max" className="text-xs font-semibold text-slate-500">Maksimum Panjang Input (Karakter)</Label>
                      <Input
                        id="gr-max"
                        type="number"
                        min={0}
                        value={maxInputChars}
                        onChange={(e) =>
                          setMaxInputChars(Number(e.target.value) || 0)
                        }
                        className="rounded-xl border-slate-200 focus-visible:ring-violet-500 text-sm"
                      />
                      <p className="text-[10px] text-slate-400">
                        0 = tanpa batasan panjang.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="gr-refusal" className="text-xs font-semibold text-slate-500">Pesan Penolakan Kustom</Label>
                      <Input
                        id="gr-refusal"
                        value={refusalMessage}
                        onChange={(e) => setRefusalMessage(e.target.value)}
                        placeholder="Maaf, saya tidak dapat menjawab hal tersebut."
                        className="rounded-xl border-slate-200 focus-visible:ring-violet-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      {/* Form Submission */}
      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          disabled={saving}
          className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-6 font-bold shadow-md shadow-slate-900/10 active:scale-[0.98] transition-all"
        >
          {saving ? "Menyimpan…" : "Simpan Semua Perubahan"}
        </Button>
      </div>

    </form>
  );
}
