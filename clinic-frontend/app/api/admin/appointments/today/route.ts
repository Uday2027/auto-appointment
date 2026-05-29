import { NextResponse } from "next/server";
import { fetchN8N, safeJson } from "@/lib/server-api";

export async function GET() {
  try {
    const res = await fetchN8N("admin/appointments/today", {
      method: "GET",
    });
    const data = await safeJson(res);
    
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
