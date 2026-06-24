"use client";

import Link from "next/link";
import { Bot, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, buttonVariants } from "@/components/ui/button";

export default function SiteHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold">Multi-Agent Chatbot</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">
                {user.name || user.email}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Keluar
            </Button>
          </div>
        ) : (
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Masuk
          </Link>
        )}
      </div>
    </header>
  );
}
