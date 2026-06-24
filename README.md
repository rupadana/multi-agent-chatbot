# Multi-Agent Chatbot

Platform untuk membuat **banyak agent chatbot**, mengisi **knowledge base** tiap agent, dan mengujinya di **playground** secara langsung. Mendukung **provider LLM apa pun yang OpenAI-compatible** dengan retrieval knowledge base sederhana (RAG).

- **Backend**: Python + FastAPI
- **Frontend**: Next.js (App Router) + Tailwind CSS + **shadcn/ui**
- **Database**: SQLite (via SQLModel)
- **Autentikasi**: Registrasi/login berbasis **JWT** (bcrypt untuk hashing password); tiap pengguna hanya melihat agent miliknya
- **LLM**: Endpoint OpenAI-compatible (OpenAI, OpenRouter, Together, Ollama, LM Studio, vLLM, dll) via OpenAI SDK — base URL, API key, dan model bisa dikustom

## Fitur

- ✅ **Autentikasi**: daftar & login, sesi disimpan via token JWT; setiap agent + knowledge base terikat pada akun pemiliknya
- ✅ Membuat, mengedit, dan menghapus banyak agent (persona + system prompt)
- ✅ **Base URL, API key, dan model bisa dikustom** — global lewat `.env`, atau dioverride per-agent dari UI
- ✅ **Guardrails yang bisa dikonfigurasi per-agent** — aturan/batasan topik (disuntik ke system prompt), kata/frasa terlarang (dicek di input & output), batas panjang input, dan pesan penolakan kustom
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

# WAJIB diganti dengan string acak panjang di produksi:
JWT_SECRET=ubah-secret-ini-di-produksi
ACCESS_TOKEN_EXPIRE_MINUTES=10080       # masa berlaku token (default 7 hari)
```

Tiap agent bisa **mengoverride** Base URL / API Key / Model dari tab **Pengaturan**
(kosongkan untuk memakai default `.env`). Jadi satu agent bisa pakai OpenAI, agent
lain pakai Ollama lokal atau OpenRouter.

> **Catatan:** API key hanya dibutuhkan untuk fitur playground (chat).
> Membuat agent dan mengelola knowledge base tetap berjalan tanpa API key.

## Menjalankan Test (Backend)

Test memakai `pytest` dengan database SQLite sementara dan `stream_chat` yang
ditambal, jadi **tidak perlu API key / panggilan LLM nyata**.

```bash
cd backend
source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
```

Cakupan: autentikasi (register/login/me), CRUD agent + isolasi kepemilikan
antar-user, knowledge base, dan chat SSE termasuk guardrails input/output.

## Menjalankan Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Buka `http://localhost:3000`.

## Alur Pemakaian

1. **Daftar / login** di `/register` atau `/login`. Token disimpan di browser
   dan dipakai otomatis untuk semua permintaan berikutnya.
1. Buat agent baru di halaman utama (beri nama + system prompt).
2. Buka agent → tab **Knowledge Base** → tambahkan dokumen pengetahuan.
3. Pindah ke tab **Playground** → mulai mengobrol. Jawaban akan memakai
   knowledge base yang relevan dan menampilkan sumbernya.
4. Tab **Pengaturan** untuk mengubah persona atau model.

## Endpoint Utama (Backend)

Semua endpoint `/api/agents/**` membutuhkan header `Authorization: Bearer <token>`
yang didapat dari `/api/auth/login` atau `/api/auth/register`.

| Method | Path | Keterangan |
| ------ | ---- | ---------- |
| `POST` | `/api/auth/register` | Daftar akun, mengembalikan token + data user |
| `POST` | `/api/auth/login` | Login, mengembalikan token + data user |
| `GET` | `/api/auth/me` | Data user dari token (butuh Bearer token) |
| `GET` | `/api/agents` | Daftar agent (milik user) |
| `POST` | `/api/agents` | Buat agent |
| `PUT` | `/api/agents/{id}` | Update agent |
| `DELETE` | `/api/agents/{id}` | Hapus agent |
| `GET/POST` | `/api/agents/{id}/knowledge` | List / tambah dokumen |
| `DELETE` | `/api/agents/{id}/knowledge/{doc_id}` | Hapus dokumen |
| `POST` | `/api/agents/{id}/chat` | Chat streaming (SSE) |

## Guardrails

Tiap agent punya guardrails yang bisa diaktifkan dari tab **Pengaturan**, semuanya
berjalan lokal tanpa panggilan LLM tambahan:

1. **Aturan & batasan topik** — teks bebas yang disuntikkan ke system prompt sebagai
   aturan wajib (mis. "Hanya jawab seputar produk toko").
2. **Kata/frasa terlarang** — dicek pada **input pengguna** (sebelum LLM dipanggil)
   dan pada **output model** (streaming dengan *hold-back buffer*, sehingga kata
   terlarang tidak pernah sempat ter-stream walau terpotong antar-chunk).
3. **Batas panjang input** — menolak pesan yang terlalu panjang.
4. **Pesan penolakan kustom** — ditampilkan saat ada guardrail yang terpicu.

Saat terpicu, playground menampilkan pesan dengan badge **⚠ Diblokir oleh guardrail**.

## Cara Kerja RAG

Knowledge base dipotong menjadi beberapa chunk per paragraf. Untuk tiap
pertanyaan, chunk diberi skor berdasarkan irisan kata dengan pertanyaan (dengan
penyaringan stopword Indonesia/Inggris), lalu chunk paling relevan disuntikkan ke
system prompt. Pendekatan ini tidak butuh API embedding eksternal sehingga ringan
dan cocok untuk knowledge base kecil–menengah.
