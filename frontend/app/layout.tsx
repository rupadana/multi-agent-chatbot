import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import ClientLayout from "@/components/ClientLayout";

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
          <ClientLayout>{children}</ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
