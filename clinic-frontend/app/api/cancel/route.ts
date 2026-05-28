import { NextRequest, NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "";
const isMock = !N8N_URL || N8N_URL.includes("YOUR_N8N_BASE_URL");

export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("[API /api/cancel] received from frontend:", body);

  if (isMock) {
    console.log("[API /api/cancel] MOCK MODE — no n8n URL configured");
    await new Promise((r) => setTimeout(r, 800));
    const mockResponse = { success: true, message: "Appointment cancelled successfully (mock)" };
    console.log("[API /api/cancel] mock response:", mockResponse);
    return NextResponse.json(mockResponse);
  }

  const queryParams = new URLSearchParams({
    bookingId: body.bookingId || "",
    email: body.email || "",
    reason: body.reason || "",
  });
  const n8nEndpoint = `${N8N_URL}/webhook/cancel?${queryParams.toString()}`;
  console.log("[API /api/cancel] forwarding to n8n:", n8nEndpoint);

  try {
    const res = await fetch(n8nEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: body.bookingId,
        email: body.email,
        reason: body.reason,
      }),
    });

    const data = await res.json().catch(() => ({
      success: false,
      message: "Invalid response from n8n",
    }));

    console.log("[API /api/cancel] n8n status:", res.status, "n8n response:", data);

    // If n8n returns 400 (cannot cancel deadline passed, etc.), extract the reason
    if (!res.ok) {
      let errorMessage = "Cancellation failed";
      if (Array.isArray(data) && data[0] && data[0].json) {
        errorMessage = data[0].json.reason || errorMessage;
      } else if (data.reason) {
        errorMessage = data.reason;
      } else if (data.message) {
        errorMessage = data.message;
      }
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Appointment cancelled successfully",
      data,
    });
  } catch (err) {
    console.error("[API /api/cancel] error calling n8n:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error" },
      { status: 500 }
    );
  }
}
