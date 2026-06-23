"use client";

import { useEffect, useState } from "react";
import { api, KnowledgeDoc } from "@/lib/api";

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
      <form
        onSubmit={submit}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 className="font-semibold">Tambah Dokumen</h3>
        <div>
          <label className="mb-1 block text-sm font-medium">Judul</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Misal: Kebijakan Pengembalian"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Isi</label>
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Tempel teks pengetahuan di sini…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Menyimpan…" : "Simpan Dokumen"}
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="font-semibold">
          Dokumen ({docs.length})
        </h3>
        {loading ? (
          <p className="text-slate-500">Memuat…</p>
        ) : docs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Belum ada dokumen. Knowledge base kosong.
          </p>
        ) : (
          docs.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <h4 className="font-medium">{d.title}</h4>
                <button
                  onClick={() => remove(d.id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Hapus
                </button>
              </div>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-slate-500">
                {d.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
