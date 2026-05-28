import { NextRequest, NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "";
const isMock = !N8N_URL || N8N_URL.includes("YOUR_N8N_BASE_URL");

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("[API /api/book] received from frontend:", body);

  if (isMock) {
    console.log("[API /api/book] MOCK MODE — no n8n URL configured");
    await new Promise((r) => setTimeout(r, 800));
    const mockResponse = { success: true, message: "Appointment received (mock)" };
    console.log("[API /api/book] mock response:", mockResponse);
    return NextResponse.json(mockResponse);
  }

  const n8nEndpoint = `${N8N_URL}/webhook/new-booking`;
  console.log("[API /api/book] forwarding to n8n:", n8nEndpoint);

  try {
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
      { success: false, message: err instanceof Error ? err.message : "Network error" },
      { status: 500 }
    );
  }
}
