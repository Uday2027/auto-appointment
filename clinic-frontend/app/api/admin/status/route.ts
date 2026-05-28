import { NextRequest, NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "";
const isMock = !N8N_URL || N8N_URL.includes("YOUR_N8N_BASE_URL");

export async function POST(req: NextRequest) {
  if (isMock) {
    await new Promise((r) => setTimeout(r, 800));
    const body = await req.json().catch(() => ({}));
    return NextResponse.json({ success: true, status: body.status || "Completed" });
  }

  try {
    const body = await req.json();
    const res = await fetch(`${N8N_URL}/webhook/admin/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : "Network error" },
      { status: 500 }
    );
  }
}
