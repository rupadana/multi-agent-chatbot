import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import SiteHeader from "@/components/SiteHeader";

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
        <AuthProvider>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
