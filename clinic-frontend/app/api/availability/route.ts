import { NextRequest, NextResponse } from "next/server";
import { fetchN8N, safeJson } from "@/lib/server-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[API /api/availability] received:", body);

    const res = await fetchN8N("availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await safeJson(res);
    console.log("[API /api/availability] processed response:", data);
    
    // Ensure the response is always a list for the client-side component
    const availability = Array.isArray(data) ? data : [];
    return NextResponse.json(availability);
  } catch (err) {
    console.error("[API /api/availability] error calling n8n:", err);
    return NextResponse.json([], { status: 500 });
  }
}
