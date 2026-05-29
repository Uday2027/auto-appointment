import { NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "http://localhost:5678";

export async function GET() {
  try {
    const res = await fetch(`${N8N_URL}/webhook/admin/stats`);
    if (!res.ok) throw new Error(`n8n returned status ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /api/admin/stats] n8n lookup failed:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error calling n8n webhook" },
      { status: 500 }
    );
  }
}
