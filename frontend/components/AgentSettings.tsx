"use client";

import { useState } from "react";
import { Agent, AgentInput, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <Card className="max-w-2xl">
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Nama</Label>
            <Input
              id="s-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-desc">Deskripsi</Label>
            <Input
              id="s-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-prompt">System Prompt</Label>
            <Textarea
              id="s-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
            />
          </div>

          <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-semibold">
              Konfigurasi LLM (OpenAI-compatible)
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="s-model">Model</Label>
              <Input
                id="s-model"
                required
                list="model-suggestions"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o-mini"
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
            <div className="space-y-1.5">
              <Label htmlFor="s-baseurl">Base URL</Label>
              <Input
                id="s-baseurl"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="Kosongkan untuk pakai default server"
              />
              <p className="text-xs text-muted-foreground">
                Contoh: https://api.openai.com/v1, https://openrouter.ai/api/v1,
                http://localhost:11434/v1 (Ollama).
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-apikey">API Key</Label>
              <Input
                id="s-apikey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  agent.has_api_key
                    ? "•••••••• (tersimpan — isi untuk mengganti)"
                    : "Kosongkan untuk pakai default server"
                }
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={grEnabled}
                onChange={(e) => setGrEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm font-semibold">Aktifkan Guardrails</span>
            </label>

            {grEnabled && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="gr-instructions">Aturan &amp; batasan</Label>
                  <Textarea
                    id="gr-instructions"
                    value={grInstructions}
                    onChange={(e) => setGrInstructions(e.target.value)}
                    rows={3}
                    placeholder="Mis: Hanya jawab seputar produk toko. Tolak pertanyaan medis, hukum, atau di luar topik."
                  />
                  <p className="text-xs text-muted-foreground">
                    Disuntikkan ke system prompt sebagai aturan wajib.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gr-keywords">Kata/frasa terlarang</Label>
                  <Textarea
                    id="gr-keywords"
                    value={blockedKeywords}
                    onChange={(e) => setBlockedKeywords(e.target.value)}
                    rows={3}
                    placeholder="Satu per baris (atau pisah koma). Dicek pada input pengguna dan output model."
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="gr-max">
                      Batas panjang input (karakter)
                    </Label>
                    <Input
                      id="gr-max"
                      type="number"
                      min={0}
                      value={maxInputChars}
                      onChange={(e) =>
                        setMaxInputChars(Number(e.target.value) || 0)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      0 = tanpa batas.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="gr-refusal">Pesan penolakan</Label>
                    <Input
                      id="gr-refusal"
                      value={refusalMessage}
                      onChange={(e) => setRefusalMessage(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {msg && (
            <Alert>
              <AlertDescription className="text-green-600">
                {msg}
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan Perubahan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
