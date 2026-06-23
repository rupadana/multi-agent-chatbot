# Multi-Agent Chatbot

Platform untuk membuat **banyak agent chatbot**, mengisi **knowledge base** tiap agent, dan mengujinya di **playground** secara langsung. Mendukung **provider LLM apa pun yang OpenAI-compatible** dengan retrieval knowledge base sederhana (RAG).

- **Backend**: Python + FastAPI
- **Frontend**: Next.js (App Router) + Tailwind CSS
- **Database**: SQLite (via SQLModel)
- **LLM**: Endpoint OpenAI-compatible (OpenAI, OpenRouter, Together, Ollama, LM Studio, vLLM, dll) via OpenAI SDK — base URL, API key, dan model bisa dikustom

## Fitur

- ✅ Membuat, mengedit, dan menghapus banyak agent (persona + system prompt)
- ✅ **Base URL, API key, dan model bisa dikustom** — global lewat `.env`, atau dioverride per-agent dari UI
- ✅ Mengisi knowledge base tiap agent (tambah/hapus dokumen)
- ✅ Playground untuk menguji agent dengan jawaban yang di-streaming
- ✅ Retrieval otomatis: potongan knowledge base yang relevan disuntikkan ke konteks, lengkap dengan info sumber yang dipakai

## Struktur

```
backend/    # FastAPI: CRUD agent, knowledge base, chat streaming
frontend/   # Next.js: UI daftar agent, editor KB, playground
```

## Menjalankan Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate           # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env                 # lalu isi LLM_BASE_URL, LLM_API_KEY, LLM_MODEL
uvicorn app.main:app --reload --port 8000
```

API berjalan di `http://localhost:8000` (dokumentasi interaktif di `/docs`).

Default provider diatur lewat `.env`:

```env
LLM_BASE_URL=https://api.openai.com/v1   # atau OpenRouter/Together/Ollama/dll
LLM_API_KEY=sk-xxxxx
LLM_MODEL=gpt-4o-mini
```

Tiap agent bisa **mengoverride** Base URL / API Key / Model dari tab **Pengaturan**
(kosongkan untuk memakai default `.env`). Jadi satu agent bisa pakai OpenAI, agent
lain pakai Ollama lokal atau OpenRouter.

> **Catatan:** API key hanya dibutuhkan untuk fitur playground (chat).
> Membuat agent dan mengelola knowledge base tetap berjalan tanpa API key.

## Menjalankan Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Buka `http://localhost:3000`.

## Alur Pemakaian

1. Buat agent baru di halaman utama (beri nama + system prompt).
2. Buka agent → tab **Knowledge Base** → tambahkan dokumen pengetahuan.
3. Pindah ke tab **Playground** → mulai mengobrol. Jawaban akan memakai
   knowledge base yang relevan dan menampilkan sumbernya.
4. Tab **Pengaturan** untuk mengubah persona atau model.

## Endpoint Utama (Backend)

| Method | Path | Keterangan |
| ------ | ---- | ---------- |
| `GET` | `/api/agents` | Daftar agent |
| `POST` | `/api/agents` | Buat agent |
| `PUT` | `/api/agents/{id}` | Update agent |
| `DELETE` | `/api/agents/{id}` | Hapus agent |
| `GET/POST` | `/api/agents/{id}/knowledge` | List / tambah dokumen |
| `DELETE` | `/api/agents/{id}/knowledge/{doc_id}` | Hapus dokumen |
| `POST` | `/api/agents/{id}/chat` | Chat streaming (SSE) |

## Cara Kerja RAG

Knowledge base dipotong menjadi beberapa chunk per paragraf. Untuk tiap
pertanyaan, chunk diberi skor berdasarkan irisan kata dengan pertanyaan (dengan
penyaringan stopword Indonesia/Inggris), lalu chunk paling relevan disuntikkan ke
system prompt. Pendekatan ini tidak butuh API embedding eksternal sehingga ringan
dan cocok untuk knowledge base kecil–menengah.
