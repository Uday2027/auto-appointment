import { NextRequest, NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "";
const isMock = !N8N_URL || N8N_URL.includes("YOUR_N8N_BASE_URL");

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("[API /api/reschedule] received from frontend:", body);

  if (isMock) {
    console.log("[API /api/reschedule] MOCK MODE — no n8n URL configured");
    await new Promise((r) => setTimeout(r, 800));
    const mockResponse = { success: true, message: "Appointment rescheduled successfully (mock)" };
    console.log("[API /api/reschedule] mock response:", mockResponse);
    return NextResponse.json(mockResponse);
  }

  const queryParams = new URLSearchParams({
    bookingId: body.bookingId || "",
    email: body.email || "",
    newDate: body.newDate || "",
    newTime: body.newTime || "",
    reason: body.reason || "",
  });
  const n8nEndpoint = `${N8N_URL}/webhook/reschedule?${queryParams.toString()}`;
  console.log("[API /api/reschedule] forwarding to n8n:", n8nEndpoint);

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

    console.log("[API /api/reschedule] n8n status:", res.status, "n8n response:", data);

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: data.message || `Reschedule failed (${res.status})` },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /api/reschedule] error calling n8n:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error" },
      { status: 500 }
    );
  }
}
