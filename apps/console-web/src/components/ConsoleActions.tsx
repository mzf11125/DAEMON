"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getClient } from "@/lib/client";
import { signInWithPassword, signOut } from "@/lib/auth";
import { DuneIngestDemo } from "@/components/DuneIngestDemo";

type Props = { signedIn?: boolean };

export function ConsoleActions({ signedIn }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [email, setEmail] = useState("analyst@demo.local");
  const [password, setPassword] = useState("analyst");
  const [busy, setBusy] = useState(false);
  const [jobStatus, setJobStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await (await getClient()).getJob(jobId);
        const st = String(res.status ?? "unknown");
        if (!cancelled) {
          setJobStatus(st);
          setMessage(`Job ${jobId}: ${st}`);
        }
        if (st === "completed" || st === "failed") return;
      } catch {
        if (!cancelled) setMessage(`Job ${jobId}: poll error`);
      }
      if (!cancelled) setTimeout(poll, 2000);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2>Actions</h2>
      <div className="card" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await signInWithPassword(email, password);
              setMessage("Signed in. Reloading…");
              router.refresh();
            })
          }
        >
          Sign in (Supabase)
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await signOut();
              setMessage("Signed out.");
              router.refresh();
            })
          }
        >
          Sign out
        </button>
        <button
          type="button"
          disabled={busy || !signedIn}
          onClick={() =>
            run(async () => {
              const api = await getClient();
              const res = await api.evaluateRules();
              setMessage(`Rules evaluated: ${res.count} signal(s) created.`);
              router.refresh();
            })
          }
        >
          Run rules
        </button>
        <button
          type="button"
          disabled={busy || !signedIn}
          onClick={() =>
            run(async () => {
              const api = await getClient();
              const res = await api.openCase({
                title: "Console investigation",
                signalIds: [],
              });
              setMessage(`Case opened: ${String(res.caseId ?? "ok")}`);
              router.refresh();
            })
          }
        >
          Open case
        </button>
        <button
          type="button"
          disabled={busy || !signedIn}
          onClick={() =>
            run(async () => {
              const api = await getClient();
              const res = await api.createJob("seed-csv");
              setJobId(res.jobId);
              setJobStatus(String(res.status ?? "pending"));
              setMessage(`Ingestion job ${res.jobId} (${res.status}) — polling every 2s`);
            })
          }
        >
          Start ingestion job
        </button>
        <button
          type="button"
          disabled={busy || !jobId}
          onClick={() =>
            run(async () => {
              if (!jobId) return;
              const api = await getClient();
              const res = await api.getJob(jobId);
              setMessage(`Job ${jobId}: ${String(res.status ?? "unknown")}`);
            })
          }
        >
          Poll job
        </button>
      </div>
      <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem" }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
        />
      </div>
      <DuneIngestDemo
        busy={busy}
        run={run}
        onJobStarted={(id, st) => {
          setJobId(id);
          setJobStatus(st);
          setMessage(`Ingestion job ${id} (${st}) — polling every 2s`);
        }}
      />
      {jobStatus && <p className="muted">Job status: {jobStatus}</p>}
      {message && <p className="muted" style={{ marginTop: "0.75rem" }}>{message}</p>}
    </section>
  );
}
