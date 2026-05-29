import { NextResponse } from "next/server";
import { fetchN8N } from "@/lib/server-api";

export async function GET() {
  try {
    const res = await fetchN8N("admin/appointments", {
      method: "GET",
    });
    if (!res.ok) throw new Error(`n8n returned status ${res.status}`);
    const data = await res.json();
    
    let appointments = data.appointments || [];
    
    // Filter out invalid/empty items (e.g. doctor details or missing patient name)
    appointments = appointments.filter((appt: any) => appt && appt["Patient Name"] && appt["Booking ID"]);
    
    return NextResponse.json({
      appointments,
      total: appointments.length
    });
  } catch (err) {
    console.error("[API /api/admin/appointments] n8n lookup failed:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error calling n8n webhook" },
      { status: 500 }
    );
  }
}
