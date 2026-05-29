import { NextRequest, NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "http://localhost:5678";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const problem = body.Problem || "";
    console.log("[API /api/available-doctors] received:", body);

    const n8nEndpoint = `${N8N_URL}/webhook/available-doctors`;
    console.log("[API /api/available-doctors] forwarding to n8n:", n8nEndpoint);

    const res = await fetch(n8nEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Problem: problem }),
    });

    if (!res.ok) {
      throw new Error(`n8n returned status ${res.status}`);
    }

    const data = await res.json();
    console.log("[API /api/available-doctors] n8n response:", data);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /api/available-doctors] error calling n8n:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error calling n8n webhook" },
      { status: 500 }
    );
  }
}
