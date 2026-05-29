import { NextRequest, NextResponse } from "next/server";
import { fetchN8N } from "@/lib/server-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetchN8N("admin/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`n8n returned status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /api/admin/status] error completing session:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error calling n8n webhook" },
      { status: 500 }
    );
  }
}
