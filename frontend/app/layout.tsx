import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multi-Agent Chatbot",
  description: "Buat banyak agent, isi knowledge base, dan uji di playground.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                AI
              </span>
              <span className="text-lg font-semibold">Multi-Agent Chatbot</span>
            </Link>
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 hover:text-indigo-600"
            >
              Daftar Agent
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
