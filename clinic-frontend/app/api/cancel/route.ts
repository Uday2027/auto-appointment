import { NextRequest, NextResponse } from "next/server";
import { fetchN8N } from "@/lib/server-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[API /api/cancel] received from frontend:", body);

    const queryParams = new URLSearchParams({
      bookingId: body.bookingId || "",
      email: body.email || "",
      reason: body.reason || "",
    });
    const path = `cancel?${queryParams.toString()}`;

    const res = await fetchN8N(path, {
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
      { success: false, message: err instanceof Error ? err.message : "Network error calling n8n webhook" },
      { status: 500 }
    );
  }
}
