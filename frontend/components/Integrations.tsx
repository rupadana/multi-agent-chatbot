"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, Plug, Trash2 } from "lucide-react";
import { api, Integration, IntegrationType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TYPE_LABEL: Record<IntegrationType, string> = {
  whatsapp: "WhatsApp (WAHA)",
  telegram: "Telegram",
};

export default function Integrations({ agentId }: { agentId: number }) {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setItems(await api.listIntegrations(agentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat integrasi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <AddIntegrationForm agentId={agentId} onAdded={load} />

      <div className="space-y-3">
        <h3 className="font-semibold">Kanal Terhubung ({items.length})</h3>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <p className="text-muted-foreground">Memuat…</p>
        ) : items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Belum ada kanal. Tambahkan WhatsApp atau Telegram di sebelah kiri.
            </CardContent>
          </Card>
        ) : (
          items.map((it) => (
            <IntegrationCard key={it.id} item={it} onChanged={load} />
          ))
        )}
      </div>
    </div>
  );
}

function AddIntegrationForm({
  agentId,
  onAdded,
}: {
  agentId: number;
  onAdded: () => void;
}) {
  const [type, setType] = useState<IntegrationType>("telegram");
  const [apiKey, setApiKey] = useState("");
  const [providerUrl, setProviderUrl] = useState("");
  const [sessionName, setSessionName] = useState("default");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.createIntegration(agentId, {
        type,
        api_key: apiKey,
        provider_url: type === "whatsapp" ? providerUrl : "",
        session_name: type === "whatsapp" ? sessionName : "default",
      });
      setApiKey("");
      setProviderUrl("");
      setSessionName("default");
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambahkan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tambah Kanal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="int-type">Kanal</Label>
            <div className="flex gap-2">
              {(["telegram", "whatsapp"] as IntegrationType[]).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={type === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setType(t)}
                >
                  {TYPE_LABEL[t]}
                </Button>
              ))}
            </div>
          </div>

          {type === "whatsapp" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="int-url">Base URL WAHA</Label>
                <Input
                  id="int-url"
                  required
                  value={providerUrl}
                  onChange={(e) => setProviderUrl(e.target.value)}
                  placeholder="http://localhost:3000"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="int-session">Nama Session</Label>
                <Input
                  id="int-session"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="default"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="int-key">
              {type === "telegram" ? "Bot Token" : "API Key (X-Api-Key WAHA)"}
            </Label>
            <Input
              id="int-key"
              type="password"
              required
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                type === "telegram" ? "123456:ABC-DEF…" : "Kunci API WAHA"
              }
            />
            {type === "telegram" && (
              <p className="text-xs text-muted-foreground">
                Dapatkan dari @BotFather di Telegram.
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Menyimpan…" : "Tambah Kanal"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function IntegrationCard({
  item,
  onChanged,
}: {
  item: Integration;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const webhook = item.webhook_url ?? item.webhook_path;

  const toggle = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.updateIntegration(item.id, { enabled: !item.enabled });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  };

  const connect = async () => {
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const res = await api.connectIntegration(item.id);
      setMsg(res.detail);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghubungkan");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Hapus kanal ini?")) return;
    await api.deleteIntegration(item.id);
    onChanged();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(webhook);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">{TYPE_LABEL[item.type]}</span>
            <Badge variant={item.enabled ? "default" : "secondary"}>
              {item.enabled ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={remove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {item.type === "whatsapp" && (
          <p className="text-xs text-muted-foreground">
            {item.provider_url || "—"} · session{" "}
            <span className="font-mono">{item.session_name}</span>
          </p>
        )}

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">URL Webhook</Label>
          <div className="flex gap-2">
            <Input readOnly value={webhook} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={copy} title="Salin">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {!item.webhook_url && (
            <p className="text-xs text-amber-600">
              Set <span className="font-mono">PUBLIC_BASE_URL</span> di server agar
              URL webhook lengkap & bisa auto-connect.
            </p>
          )}
          {copied && <p className="text-xs text-green-600">Tersalin!</p>}
        </div>

        {msg && (
          <Alert>
            <AlertDescription className="text-green-600">{msg}</AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={connect} disabled={busy}>
            <Link2 className="h-4 w-4" />
            Hubungkan
          </Button>
          <Button variant="ghost" size="sm" onClick={toggle} disabled={busy}>
            <Plug className="h-4 w-4" />
            {item.enabled ? "Nonaktifkan" : "Aktifkan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
