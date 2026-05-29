import { NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "http://localhost:5678";

export async function GET() {
  let n8nReachable = false;
  let n8nError = "";

  try {
    const res = await fetch(`${N8N_URL}/healthz`, { signal: AbortSignal.timeout(3000) });
    n8nReachable = res.ok;
  } catch (err) {
    n8nError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json({
    mode: "proxy",
    n8n_url: N8N_URL,
    n8n_reachable: n8nReachable,
    n8n_error: n8nError || null,
    message: n8nReachable
      ? "n8n is reachable"
      : `n8n is NOT reachable — ${n8nError}`,
  });
}
