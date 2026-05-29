import { NextResponse } from "next/server";
import { fetchN8N, safeJson } from "@/lib/server-api";

export async function GET() {
  try {
    const res = await fetchN8N("admin/stats", {
      method: "GET",
    });
    const data = await safeJson(res);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /api/admin/stats] n8n lookup failed:", err);
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error calling n8n webhook" },
      { status: 500 }
    );
  }
}
