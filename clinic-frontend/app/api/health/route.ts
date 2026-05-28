import { NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "";
const isMock = !N8N_URL || N8N_URL.includes("YOUR_N8N_BASE_URL");

export async function GET() {
  let n8nReachable = false;
  let n8nError = "";

  if (!isMock) {
    try {
      const res = await fetch(`${N8N_URL}/healthz`, { signal: AbortSignal.timeout(3000) });
      n8nReachable = res.ok;
    } catch (err) {
      n8nError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    mode: isMock ? "mock" : "proxy",
    n8n_url: isMock ? null : N8N_URL,
    n8n_reachable: n8nReachable,
    n8n_error: n8nError || null,
    message: isMock
      ? "RUNNING IN MOCK MODE — set NEXT_PUBLIC_N8N_URL in .env.local to connect to real n8n"
      : n8nReachable
        ? "n8n is reachable"
        : `n8n is NOT reachable — ${n8nError}`,
  });
}
