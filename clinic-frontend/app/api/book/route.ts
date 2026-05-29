import { NextRequest, NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "http://localhost:5678";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[API /api/book] received from frontend:", body);

    const n8nEndpoint = `${N8N_URL}/webhook/new-booking`;
    console.log("[API /api/book] forwarding to n8n:", n8nEndpoint);

    const res = await fetch(n8nEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({
      success: false,
      message: "Invalid response from n8n",
    }));

    console.log("[API /api/book] n8n status:", res.status, "n8n response:", data);

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: data.message || `Booking failed (${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /api/book] error calling n8n:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error calling n8n webhook" },
      { status: 500 }
    );
  }
}
