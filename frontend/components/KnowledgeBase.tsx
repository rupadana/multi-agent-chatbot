"use client";

import { useEffect, useState } from "react";
import { 
  Trash2, 
  FileText, 
  Plus, 
  Database, 
  Pencil, 
  Upload, 
  Loader2, 
  FileUp,
  X 
} from "lucide-react";
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
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputMode, setInputMode] = useState<"text" | "upload">("text");
  const [editingDocId, setEditingDocId] = useState<number | null>(null);

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
    cancelEdit();
  }, [agentId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingDocId !== null) {
        await api.updateDoc(agentId, editingDocId, { title, content });
        setEditingDocId(null);
      } else {
        await api.addDoc(agentId, { title, content });
      }
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

  const startEdit = (doc: KnowledgeDoc) => {
    setEditingDocId(doc.id);
    setTitle(doc.title);
    setContent(doc.content);
    setInputMode("text");
    setError(null);
  };

  const cancelEdit = () => {
    setEditingDocId(null);
    setTitle("");
    setContent("");
    setError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await handleFile(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await handleFile(file);
    }
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      await api.uploadDoc(agentId, file);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah file");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-slate-800 pb-8 animate-in fade-in duration-200">
      
      {/* Form Card */}
      <div>
        <Card className="rounded-3xl border border-slate-200/50 shadow-[0_4px_24px_rgba(0,0,0,0.01)] bg-slate-50/30 overflow-hidden">
          <CardHeader className="border-b border-slate-100/60 pb-3.5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              {editingDocId ? (
                <>
                  <Pencil className="h-4 w-4 text-amber-500" />
                  <span>Ubah Dokumen</span>
                </>
              ) : inputMode === "text" ? (
                <>
                  <Plus className="h-4 w-4 text-violet-600" />
                  <span>Tambah Dokumen Baru</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 text-violet-600" />
                  <span>Unggah File Dokumen</span>
                </>
              )}
            </CardTitle>
            
            {editingDocId && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={cancelEdit}
                className="h-7 text-xs font-semibold rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              >
                Batal Edit
              </Button>
            )}
          </CardHeader>
          
          <CardContent className="pt-4">
            {/* Mode Switcher */}
            {!editingDocId && (
              <div className="flex bg-slate-100 p-0.5 rounded-xl mb-4 border border-slate-200/10">
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("text");
                    setError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    inputMode === "text"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tulis Teks</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("upload");
                    setError(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    inputMode === "upload"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Unggah File</span>
                </button>
              </div>
            )}

            {inputMode === "text" || editingDocId ? (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="kb-title" className="text-xs font-semibold text-slate-500">Judul Dokumen</Label>
                  <Input
                    id="kb-title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Misal: Kebijakan Pengembalian Produk"
                    className="rounded-xl border-slate-200 bg-white focus-visible:ring-violet-500 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kb-content" className="text-xs font-semibold text-slate-500">Isi / Konten Dokumen</Label>
                  <Textarea
                    id="kb-content"
                    required
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={6}
                    placeholder="Tempel teks referensi pengetahuan di sini..."
                    className="rounded-xl border-slate-200 bg-white focus-visible:ring-violet-500 text-sm resize-none"
                  />
                </div>
                {error && (
                  <Alert variant="destructive" className="rounded-xl py-2">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
                <div className="flex gap-2">
                  {editingDocId && (
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={cancelEdit}
                      className="flex-1 rounded-xl border-slate-200 hover:bg-slate-100 text-slate-700 font-medium py-2.5 transition-all text-xs"
                    >
                      Batal
                    </Button>
                  )}
                  <Button 
                    type="submit" 
                    disabled={saving}
                    className={`flex-1 rounded-xl font-medium py-2.5 shadow-sm transition-all text-xs ${
                      editingDocId 
                        ? "bg-amber-600 hover:bg-amber-500 text-white" 
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    {saving ? "Menyimpan…" : editingDocId ? "Simpan Perubahan" : "Simpan Dokumen"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all group ${
                    dragActive
                      ? "border-violet-500 bg-violet-50/20 scale-[0.99]"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/40 bg-white"
                  }`}
                  onClick={() => document.getElementById("file-upload-input")?.click()}
                >
                  <input
                    id="file-upload-input"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".xlsx,.docx,.pdf,.md,.markdown,.txt"
                  />
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-3 rounded-2xl border transition-all ${
                      dragActive 
                        ? "bg-violet-100 border-violet-200 text-violet-600" 
                        : "bg-slate-50 border-slate-100 text-slate-400 group-hover:text-slate-600 group-hover:bg-slate-100/50"
                    }`}>
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <FileUp className="h-6 w-6" />
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700">
                        {uploading ? "Sedang memproses file..." : "Tarik & lepas file di sini, atau klik untuk memilih"}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-normal max-w-[280px] mx-auto">
                        Mendukung format spreadsheet (<strong>.xlsx</strong>), dokumen (<strong>.docx</strong>), PDF (<strong>.pdf</strong>), Markdown (<strong>.md</strong>), atau teks biasa (<strong>.txt</strong>)
                      </p>
                    </div>
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive" className="rounded-xl py-2">
                    <AlertDescription className="text-xs">{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Database className="h-4 w-4 text-violet-500" />
            <span>Semua Dokumen ({docs.length})</span>
          </h3>
        </div>

        {loading ? (
          <div className="text-center py-10 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
            <span>Memuat dokumen...</span>
          </div>
        ) : docs.length === 0 ? (
          <Card className="border-dashed border-2 border-slate-200 rounded-3xl">
            <CardContent className="py-12 text-center text-xs text-slate-400">
              Belum ada dokumen yang diunggah. Tambahkan dokumen baru atau unggah file untuk mengisi knowledge base agent ini.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3.5">
            {docs.map((d) => (
              <div 
                key={d.id} 
                className={`bg-white border rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.005)] flex items-start justify-between gap-4 group transition-all ${
                  editingDocId === d.id 
                    ? "border-amber-400 shadow-[0_2px_16px_rgba(245,158,11,0.08)] bg-amber-50/10" 
                    : "border-slate-200/60 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`p-2 border rounded-xl transition-colors shrink-0 ${
                    editingDocId === d.id
                      ? "bg-amber-100/50 border-amber-200 text-amber-600"
                      : "bg-slate-50 border-slate-200/50 text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-600"
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 leading-tight">
                    <h4 className="text-xs font-bold text-slate-800 mb-1 truncate flex items-center gap-1.5">
                      <span>{d.title}</span>
                      {editingDocId === d.id && (
                        <span className="text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                          Sedang Diubah
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal line-clamp-3 whitespace-pre-wrap">
                      {d.content}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(d)}
                    disabled={editingDocId === d.id}
                    className="text-slate-300 hover:text-slate-600 disabled:text-amber-500 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 disabled:bg-amber-50 disabled:border-amber-100 transition-all shrink-0"
                    title="Ubah Dokumen"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => remove(d.id)}
                    className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-all shrink-0"
                    title="Hapus Dokumen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
