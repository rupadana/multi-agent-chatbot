"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Agent, api } from "@/lib/api";
import RequireAuth from "@/components/RequireAuth";
import AgentSettings from "@/components/AgentSettings";
import KnowledgeBase from "@/components/KnowledgeBase";
import Playground from "@/components/Playground";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function AgentDetailPage() {
  return (
    <RequireAuth>
      <AgentDetail />
    </RequireAuth>
  );
}

function AgentDetail() {
  const params = useParams();
  const agentId = Number(params.id);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getAgent(agentId)
      .then(setAgent)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Gagal memuat agent")
      );
  }, [agentId]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!agent) return <p className="text-muted-foreground">Memuat…</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <Badge variant="outline">{agent.model}</Badge>
          {agent.guardrails_enabled && (
            <Badge variant="warning">Guardrails aktif</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {agent.description || "Tanpa deskripsi"}
        </p>
      </div>

      <Tabs defaultValue="playground">
        <TabsList>
          <TabsTrigger value="playground">Playground</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge Base</TabsTrigger>
          <TabsTrigger value="settings">Pengaturan</TabsTrigger>
        </TabsList>
        <TabsContent value="playground">
          <Playground agentId={agent.id} />
        </TabsContent>
        <TabsContent value="knowledge">
          <KnowledgeBase agentId={agent.id} />
        </TabsContent>
        <TabsContent value="settings">
          <AgentSettings agent={agent} onSaved={setAgent} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
