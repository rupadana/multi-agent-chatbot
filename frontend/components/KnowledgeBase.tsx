"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { api, KnowledgeDoc } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function KnowledgeBase({ agentId }: { agentId: number }) {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setDocs(await api.listDocs(agentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat dokumen");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.addDoc(agentId, { title, content });
      setTitle("");
      setContent("");
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Hapus dokumen ini?")) return;
    await api.deleteDoc(agentId, id);
    load();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tambah Dokumen</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="kb-title">Judul</Label>
              <Input
                id="kb-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Misal: Kebijakan Pengembalian"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kb-content">Isi</Label>
              <Textarea
                id="kb-content"
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Tempel teks pengetahuan di sini…"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan Dokumen"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="font-semibold">Dokumen ({docs.length})</h3>
        {loading ? (
          <p className="text-muted-foreground">Memuat…</p>
        ) : docs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Belum ada dokumen. Knowledge base kosong.
            </CardContent>
          </Card>
        ) : (
          docs.map((d) => (
            <Card key={d.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium">{d.title}</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => remove(d.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {d.content}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
