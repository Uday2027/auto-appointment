import { NextRequest, NextResponse } from "next/server";
import { fetchN8N, safeJson } from "@/lib/server-api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const problem = body.Problem || "";
    console.log("[API /api/available-doctors] received:", body);

    const res = await fetchN8N("available-doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Problem: problem }),
    });

    const data = await safeJson(res);
    console.log("[API /api/available-doctors] processed response:", data);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /api/available-doctors] error calling n8n:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error calling n8n webhook" },
      { status: 500 }
    );
  }
}
