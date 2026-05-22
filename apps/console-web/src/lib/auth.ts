import { createClient } from "@/lib/supabase/client";

/** Dev-only server bearer when no browser session (e.g. RSC without login). */
export function getDevBearer(): string | undefined {
  return process.env.DAEMON_DEV_BEARER;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(error.message);
  }
  if (!data.session?.access_token) {
    throw new Error("no session returned");
  }
  return data.session;
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
