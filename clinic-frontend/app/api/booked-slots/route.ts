import { NextRequest, NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "";
const isMock = !N8N_URL || N8N_URL.includes("YOUR_N8N_BASE_URL");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[API /api/booked-slots] received:", body);

    if (isMock) {
      console.log("[API /api/booked-slots] MOCK MODE");
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json(getMockBookings());
    }

    const n8nEndpoint = `${N8N_URL}/webhook/bookedSlot`;
    console.log("[API /api/booked-slots] forwarding to n8n:", n8nEndpoint);

    const res = await fetch(n8nEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`n8n returned status ${res.status}`);
    }

    const data = await res.json();
    console.log("[API /api/booked-slots] n8n response:", data);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /api/booked-slots] error calling n8n, using fallback mock:", err);
    return NextResponse.json(getMockBookings());
  }
}

function getMockBookings() {
  // Return some mock booked slots for testing purposes
  return [
    {
      "Booking ID": "BK-MOCK-9999",
      "Patient Name": "Jane Doe",
      "Appointment Time": "14:30",
      "fields": {
        "Appointment Time": "14:30"
      }
    },
    {
      "Booking ID": "BK-MOCK-8888",
      "Patient Name": "John Smith",
      "Appointment Time": "16:00",
      "fields": {
        "Appointment Time": "16:00"
      }
    }
  ];
}
