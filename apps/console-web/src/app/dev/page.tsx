import Link from "next/link";
import { ConsoleActions } from "@/components/ConsoleActions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DevPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <main>
      <p>
        <Link href="/">← Cockpit</Link>
      </p>
      <h1>Developer tools</h1>
      <p className="muted">Auth, rules, ingestion, and Dune demo — not for production operators.</p>
      <ConsoleActions signedIn={!!session} />
    </main>
  );
}
