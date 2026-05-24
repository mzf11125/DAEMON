"use client";

type Pin = {
  id: string;
  objectType: string;
  name?: string;
  latitude: number;
  longitude: number;
  vertical?: string;
};

type Signal = {
  signalId: string;
  summary?: string;
  severity?: string;
};

function project(
  lat: number,
  lon: number,
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
) {
  const x = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1)) * 100;
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1)) * 100;
  return { x: Math.min(98, Math.max(2, x)), y: Math.min(98, Math.max(2, y)) };
}

export function LiveMap({
  sites,
  assets,
  signals,
}: {
  sites: Pin[];
  assets: Pin[];
  signals: Signal[];
}) {
  const pins = [...sites, ...assets];
  if (pins.length === 0) {
    return <p className="muted">No geo-tagged Sites or Assets for this tenant.</p>;
  }
  const lats = pins.map((p) => p.latitude);
  const lons = pins.map((p) => p.longitude);
  const bounds = {
    minLat: Math.min(...lats) - 0.05,
    maxLat: Math.max(...lats) + 0.05,
    minLon: Math.min(...lons) - 0.05,
    maxLon: Math.max(...lons) + 0.05,
  };

  return (
    <Box>
      <Box
        className="card"
        style={{
          position: "relative",
          height: 420,
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
          overflow: "hidden",
        }}
        aria-label="Operational map"
      >
        {pins.map((pin) => {
          const { x, y } = project(pin.latitude, pin.longitude, bounds);
          const color = pin.objectType === "Site" ? "#38bdf8" : "#a78bfa";
          return (
            <button
              key={`${pin.objectType}-${pin.id}`}
              type="button"
              title={`${pin.name ?? pin.id} (${pin.latitude.toFixed(4)}, ${pin.longitude.toFixed(4)})`}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)",
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "2px solid #fff",
                background: color,
                cursor: "default",
                padding: 0,
              }}
            />
          );
        })}
      </Box>
      <ul style={{ marginTop: "1rem", fontSize: "0.875rem" }}>
        {pins.map((pin) => (
          <li key={`legend-${pin.id}`}>
            <strong>{pin.name ?? pin.id}</strong> · {pin.objectType}
            {pin.vertical ? ` · ${pin.vertical}` : ""}
          </li>
        ))}
      </ul>
      {signals.length > 0 && (
        <section style={{ marginTop: "1rem" }}>
          <h3>Open signals</h3>
          <ul>
            {signals.map((s) => (
              <li key={s.signalId}>
                {s.signalId}: {String(s.summary ?? "")} ({String(s.severity ?? "unknown")})
              </li>
            ))}
          </ul>
        </section>
      )}
    </Box>
  );
}

function Box({
  children,
  className,
  style,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}) {
  return (
    <div className={className} style={style} {...rest}>
      {children}
    </div>
  );
}
