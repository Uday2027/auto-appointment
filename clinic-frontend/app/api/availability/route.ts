import { NextRequest, NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "";
const isMock = !N8N_URL || N8N_URL.includes("YOUR_N8N_BASE_URL");

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[API /api/availability] received:", body);

    if (isMock) {
      console.log("[API /api/availability] MOCK MODE");
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json(getMockAvailability(body.doctors?.[0]?.id || ""));
    }

    const n8nEndpoint = `${N8N_URL}/webhook-test/availability`;
    console.log("[API /api/availability] forwarding to n8n:", n8nEndpoint);

    let res = await fetch(n8nEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    // If webhook-test fails, try production webhook endpoint as fallback
    if (!res.ok) {
      const prodEndpoint = `${N8N_URL}/webhook/availability`;
      console.log("[API /api/availability] webhook-test failed. Trying production:", prodEndpoint);
      res = await fetch(prodEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    if (!res.ok) {
      throw new Error(`n8n returned status ${res.status}`);
    }

    const data = await res.json();
    console.log("[API /api/availability] n8n response:", data);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /api/availability] error calling n8n, using fallback mock:", err);
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(getMockAvailability(body.doctors?.[0]?.id || ""));
  }
}

function getMockAvailability(doctorId: string) {
  const targetId = doctorId || "rec8HgQ3W2qDNmkp2";
  return [
    {
      id: "rec1YiKEGA3CcNaqw",
      createdTime: "2026-05-28T12:15:13.000Z",
      fields: {
        "Day of Week": "Thursday",
        "Start Time": "09:00",
        "End Time": "12:00",
        "Availability Status": "Available",
        "Doctor": [targetId],
        "Availability Name": "Dr. Ayesha Rahman - Thursday",
        "All Available Days": { state: "generated", value: "Thursday", isStale: false }
      }
    },
    {
      id: "recErSUyL4XWjyI2V",
      createdTime: "2026-05-28T12:15:13.000Z",
      fields: {
        "Day of Week": "Sunday",
        "Availability Status": "Not Available",
        "Doctor": [targetId],
        "Notes": "No clinic hours.",
        "Availability Name": "Dr. Ayesha Rahman - Sunday",
        "All Available Days": { state: "generated", value: "No available days found", isStale: false }
      }
    },
    {
      id: "recH24YuR9gV2aHVz",
      createdTime: "2026-05-28T12:15:13.000Z",
      fields: {
        "Day of Week": "Wednesday",
        "Start Time": "10:00",
        "End Time": "13:00",
        "Availability Status": "Available",
        "Doctor": [targetId],
        "Notes": "General practice hours.",
        "Availability Name": "Dr. Ayesha Rahman - Wednesday",
        "All Available Days": { state: "generated", value: "Wednesday", isStale: false }
      }
    },
    {
      id: "recKYQcjFVu0u2vhE",
      createdTime: "2026-05-28T12:15:13.000Z",
      fields: {
        "Day of Week": "Saturday",
        "Start Time": "10:00",
        "End Time": "13:00",
        "Availability Status": "Available",
        "Doctor": [targetId],
        "Notes": "Limited slots.",
        "Availability Name": "Dr. Ayesha Rahman - Saturday",
        "All Available Days": { state: "generated", value: "Saturday", isStale: false }
      }
    },
    {
      id: "recfCXwfdd8vdNvzH",
      createdTime: "2026-05-28T12:15:13.000Z",
      fields: {
        "Day of Week": "Friday",
        "Availability Status": "Not Available",
        "Doctor": [targetId],
        "Notes": "Clinic closed for administrative work.",
        "Availability Name": "Dr. Ayesha Rahman - Friday",
        "All Available Days": { state: "generated", value: "No available days found", isStale: false }
      }
    },
    {
      id: "recnAIG7ntJgx916l",
      createdTime: "2026-05-28T12:15:13.000Z",
      fields: {
        "Day of Week": "Tuesday",
        "Start Time": "14:00",
        "End Time": "17:00",
        "Availability Status": "Available",
        "Doctor": [targetId],
        "Notes": "Follow-up appointments only.",
        "Availability Name": "Dr. Ayesha Rahman - Tuesday Afternoon",
        "All Available Days": { state: "generated", value: "Tuesday", isStale: false }
      }
    },
    {
      id: "reczZuIO7EsLuU0yX",
      createdTime: "2026-05-28T12:15:13.000Z",
      fields: {
        "Day of Week": "Monday",
        "Start Time": "09:00",
        "End Time": "12:00",
        "Availability Status": "Available",
        "Doctor": [targetId],
        "Notes": "Available for new consultations.",
        "Availability Name": "Dr. Ayesha Rahman - Monday Morning",
        "All Available Days": { state: "generated", value: "Monday", isStale: false }
      }
    }
  ];
}
