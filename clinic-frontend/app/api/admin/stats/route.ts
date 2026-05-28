import { NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "";
const isMock = !N8N_URL || N8N_URL.includes("YOUR_N8N_BASE_URL");

const mockStats = {
  total: 5,
  booked: 1,
  confirmed: 3,
  completed: 0,
  cancelled: 1,
  noShow: 0,
  rescheduled: 0,
  byType: {
    newConsultation: 2,
    followUp: 1,
    reportReview: 1,
    emergency: 1,
  },
};

export async function GET() {
  if (isMock) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json(mockStats);
  }

  try {
    const res = await fetch(`${N8N_URL}/webhook/admin/stats`);
    if (!res.ok) throw new Error(`n8n returned status ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /api/admin/stats] n8n lookup failed:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error" },
      { status: 500 }
    );
  }
}
