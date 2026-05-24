"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getClient } from "@/lib/client";

export function ExceptionDeskActions() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section style={{ marginTop: "1rem" }}>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage(null);
          try {
            const api = await getClient();
            const res = await api.evaluateRules();
            setMessage(`Rules evaluated: ${res.count} signal(s) created.`);
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Rules evaluation failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        Run rules
      </button>
      {message && (
        <p className="muted" style={{ marginTop: "0.5rem" }}>
          {message}
        </p>
      )}
    </section>
  );
}
