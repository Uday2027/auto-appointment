import { NextRequest, NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "";
const isMock = !N8N_URL || N8N_URL.includes("YOUR_N8N_BASE_URL");

export async function POST(req: NextRequest) {
  let problem = "";
  try {
    const body = await req.json();
    problem = body.Problem || "";
    console.log("[API /api/available-doctors] received:", body);

    if (isMock) {
      console.log("[API /api/available-doctors] MOCK MODE");
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json(getMockDoctor(problem));
    }

    const n8nEndpoint = `${N8N_URL}/webhook/available-doctors`;
    console.log("[API /api/available-doctors] forwarding to n8n:", n8nEndpoint);

    const res = await fetch(n8nEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ Problem: problem }),
    });

    if (!res.ok) {
      throw new Error(`n8n returned status ${res.status}`);
    }

    const data = await res.json();
    console.log("[API /api/available-doctors] n8n response:", data);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[API /api/available-doctors] error calling n8n, using fallback mock:", err);
    // Return mock as fallback to ensure the frontend doesn't break if n8n is not running or is unreachable
    return NextResponse.json(getMockDoctor(problem));
  }
}

function getMockDoctor(problem: string) {
  const p = problem.toLowerCase();
  if (p.includes("chest") || p.includes("heart") || p.includes("cardio") || p.includes("breath") || p.includes("palpitations")) {
    return {
      success: true,
      id: "rec8HgQ3W2qDNmkp2",
      Specialization: "Cardiology",
      Doctor: "Dr. Ayesha Rahman"
    };
  }
  if (p.includes("child") || p.includes("kid") || p.includes("baby") || p.includes("pediatr") || p.includes("fever")) {
    return {
      success: true,
      id: "recPEDIATRIC12345",
      Specialization: "Pediatrics",
      Doctor: "Dr. Karim"
    };
  }
  // Default general health doctor
  return {
    success: true,
    id: "recGENERAL987654",
    Specialization: "General Medicine",
    Doctor: "Dr. Karim"
  };
}
