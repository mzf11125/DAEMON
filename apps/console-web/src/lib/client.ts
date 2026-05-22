import { createDaemonClient } from "@/lib/daemon-client";
import { createClient as createSupabaseBrowser } from "@/lib/supabase/client";

/** Browser-only: uses Supabase session access token. */
export async function getClient() {
  const supabase = createSupabaseBrowser();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return createDaemonClient(session?.access_token);
}
