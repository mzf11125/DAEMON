import { vi } from "vitest";

export type MockFetch = ReturnType<typeof mockFetch>;

export function mockFetch(responses: Record<string, unknown>) {
  return vi.fn((url: string | URL, _init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    for (const [pattern, response] of Object.entries(responses)) {
      if (urlStr.includes(pattern)) {
        return Promise.resolve(
          new Response(JSON.stringify({ data: response }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
    }
    return Promise.resolve(
      new Response(JSON.stringify({ data: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
}
