import { NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "http://localhost:5678";

export async function GET() {
  try {
    const res = await fetch(`${N8N_URL}/webhook/admin/appointments/today`);
    if (!res.ok) throw new Error(`n8n returned status ${res.status}`);
    const data = await res.json();
    
    let appointments = data.appointments || [];
    
    // Filter out invalid/empty items (e.g. doctor details or missing patient name)
    appointments = appointments.filter((appt: any) => appt && appt["Patient Name"] && appt["Booking ID"]);
    
    return NextResponse.json({
      appointments,
      upcoming: appointments.filter((a: any) => a.Status !== "Completed" && a.Status !== "Cancelled" && a.Status !== "No-show").length,
      total: appointments.length
    });
  } catch (err) {
    console.error("[API /api/admin/appointments/today] n8n lookup failed:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error calling n8n webhook" },
      { status: 500 }
    );
  }
}
