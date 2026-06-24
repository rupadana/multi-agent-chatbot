"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { api, Agent } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function HomePage() {
  return (
    <RequireAuth>
      <AgentList />
    </RequireAuth>
  );
}

function AgentList() {
  const { user } = useAuth();
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
          <h1 className="text-2xl font-bold">
            Halo{user?.name ? `, ${user.name}` : ""} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Buat banyak agent dengan persona dan knowledge base masing-masing.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4" />
          {showForm ? "Tutup" : "Agent Baru"}
        </Button>
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
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <p className="text-muted-foreground">Memuat…</p>
      ) : agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            Belum ada agent. Klik <strong>Agent Baru</strong> untuk membuat yang
            pertama.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <Card key={a.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{a.name}</CardTitle>
                  <Badge variant="secondary">{a.document_count} dok</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {a.description || "Tanpa deskripsi"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge variant="outline">{a.model}</Badge>
                  {a.guardrails_enabled && (
                    <Badge variant="warning">Guardrails</Badge>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/agents/${a.id}`}
                    className={buttonVariants({ size: "sm", className: "flex-1" })}
                  >
                    Buka
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => remove(a.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
  const [model, setModel] = useState("gpt-4o-mini");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
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
        model,
        base_url: baseUrl,
        api_key: apiKey,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Buat Agent Baru</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nama Agent</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Customer Support Bot"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Deskripsi</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat agent"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Menentukan persona dan instruksi dasar agent.
            </p>
          </div>

          <div className="space-y-4 rounded-lg border bg-muted/40 p-4">
            <div>
              <p className="text-sm font-semibold">
                Konfigurasi LLM (OpenAI-compatible) — opsional
              </p>
              <p className="text-xs text-muted-foreground">
                Kosongkan Base URL / API Key untuk memakai default server.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="base-url">Base URL</Label>
                <Input
                  id="base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="default"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="default"
                />
              </div>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Buat Agent"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
