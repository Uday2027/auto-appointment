import { NextRequest, NextResponse } from "next/server";
import { fetchN8N, safeJson } from "@/lib/server-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[API /api/booked-slots] received:", body);

    const res = await fetchN8N("bookedSlot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const rawData = await safeJson(res);
    console.log("[API /api/booked-slots] raw n8n response:", rawData);

    // Translate n8n's nested structure to what app/page.tsx expects:
    // n8n returns: [ { success: true, data: { fields: { "Appointment Time": "10:00" } } } ]
    // or: [ { success: true, data: [] } ]
    const bookedSlots: any[] = [];
    
    if (Array.isArray(rawData)) {
      rawData.forEach((item: any) => {
        if (item.data && !Array.isArray(item.data)) {
          const fields = item.data.fields || {};
          const time = fields["Appointment Time"] || item.data["Appointment Time"] || "";
          if (time) {
            bookedSlots.push({ "Appointment Time": time });
          }
        } else if (item["Appointment Time"] || item.fields?.["Appointment Time"]) {
          bookedSlots.push(item);
        }
      });
    }

    console.log("[API /api/booked-slots] translated response:", bookedSlots);
    return NextResponse.json(bookedSlots);
  } catch (err) {
    console.error("[API /api/booked-slots] error calling n8n:", err);
    return NextResponse.json([], { status: 500 });
  }
}
