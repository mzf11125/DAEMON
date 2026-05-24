import Link from "next/link";
import { LiveMapPanel } from "@/components/LiveMapPanel";
import { createDaemonClient } from "@/lib/daemon-client";
import { getDevBearer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const bearer = session?.access_token ?? getDevBearer();
  const client = createDaemonClient(bearer);

  let enabled = false;
  let mapData: {
    sites: Array<Record<string, unknown>>;
    assets: Array<Record<string, unknown>>;
    signals: Array<Record<string, unknown>>;
  } | null = null;
  let error: string | null = null;

  try {
    const me = await client.me();
    const features = (me.features as Record<string, unknown> | undefined) ?? {};
    enabled = features.geoMapEnabled === true;
    if (enabled) {
      mapData = await client.geoMap();
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load map";
  }

  return (
    <main>
      <p>
        <Link href="/">← Cockpit</Link>
      </p>
      <h1>Live map</h1>
      <p className="muted">2D operational view — Site pins and open Signal overlay (tenant feature flag).</p>
      {error && <p className="muted">API error: {error}</p>}
      {!enabled && !error && (
        <p className="muted">Geo map is disabled for this tenant. Enable `geoMapEnabled` in tenant_settings.</p>
      )}
      {enabled && mapData && (
        <LiveMapPanel
          sites={mapData.sites as Parameters<typeof LiveMapPanel>[0]["sites"]}
          assets={mapData.assets as Parameters<typeof LiveMapPanel>[0]["assets"]}
          signals={mapData.signals as Parameters<typeof LiveMapPanel>[0]["signals"]}
        />
      )}
    </main>
  );
}
