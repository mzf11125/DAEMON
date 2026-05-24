/**
 * Read-only Range AI investigation helpers for MCP tools.
 * When RANGE_API_KEY is unset, returns deterministic placeholder payloads for eval/CI.
 */

const DEMO_ADDRESS = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0";

export async function rangeScreenAddress(address: string): Promise<Record<string, unknown>> {
  const apiKey = process.env.RANGE_API_KEY?.trim();
  if (!apiKey) {
    return {
      source: "daemon-eval-stub",
      address,
      riskScore: 12,
      sanctionsHit: false,
      note: "Set RANGE_API_KEY for live Range AI screening.",
    };
  }
  // Live Range HTTP API is optional; eval and CI run without external calls.
  return {
    source: "range-configured",
    address,
    note: "RANGE_API_KEY present; wire Range MCP client for production live data.",
  };
}

export async function rangeGetTransfers(
  address: string,
  limit?: number,
): Promise<Record<string, unknown>> {
  const max = limit ?? 10;
  const apiKey = process.env.RANGE_API_KEY?.trim();
  if (!apiKey) {
    return {
      source: "daemon-eval-stub",
      address: address || DEMO_ADDRESS,
      transfers: [
        {
          hash: "0xstub0001",
          from: address,
          to: "0x0000000000000000000000000000000000000001",
          value: "0.1",
          token: "ETH",
        },
      ],
      limit: max,
      note: "Set RANGE_API_KEY for live Range AI transfer history.",
    };
  }
  return {
    source: "range-configured",
    address,
    transfers: [],
    limit: max,
    note: "RANGE_API_KEY present; wire Range MCP client for production live data.",
  };
}
