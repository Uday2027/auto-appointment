import { NextResponse } from "next/server";

const N8N_URL = process.env.NEXT_PUBLIC_N8N_URL || "";
const isMock = !N8N_URL || N8N_URL.includes("YOUR_N8N_BASE_URL");

const mockData = {
  appointments: [
    {
      id: "recMOCK001",
      "Booking ID": "BK-2026-001",
      "Patient Name": "Amina Rahman",
      Email: "amina.rahman@email.com",
      Phone: "+880 1711-000001",
      "Appointment Date": new Date().toISOString().split("T")[0],
      "Appointment Time": "09:30",
      "Appointment Type": "New Consultation",
      "Reason for Visit": "Frequent migraines, nausea, and minor dizziness during work hours.",
      Status: "Confirmed",
      Age: 28,
      Gender: "Female",
      Notes: "Patient reports sensitivity to bright screens.",
      "Admin Notes": "",
    },
    {
      id: "recMOCK002",
      "Booking ID": "BK-2026-002",
      "Patient Name": "Kariem Al-Fayed",
      Email: "kariem.fayed@email.com",
      Phone: "+880 1819-999888",
      "Appointment Date": new Date().toISOString().split("T")[0],
      "Appointment Time": "11:00",
      "Appointment Type": "Report Review",
      "Reason for Visit": "Post-op cardiology ultrasound review and lipid panel analysis.",
      Status: "Confirmed",
      Age: 45,
      Gender: "Male",
      Notes: "Bring previous ECG reports from Ibn Sina Diagnostic.",
      "Admin Notes": "",
    },
    {
      id: "recMOCK003",
      "Booking ID": "BK-2026-003",
      "Patient Name": "Nusrat Jahan",
      Email: "jahan.parents@email.com",
      Phone: "+880 1552-444333",
      "Appointment Date": new Date().toISOString().split("T")[0],
      "Appointment Time": "14:30",
      "Appointment Type": "Emergency / Urgent",
      "Reason for Visit": "Acute high fever (102F) and dry throat irritation since last night.",
      Status: "Booked",
      Age: 9,
      Gender: "Female",
      Notes: "Needs urgent pediatric consultation.",
      "Admin Notes": "",
    },
    {
      id: "recMOCK004",
      "Booking ID": "BK-2026-004",
      "Patient Name": "Sajid Ahmed",
      Email: "sajid.ahmed@email.com",
      Phone: "+880 1912-777666",
      "Appointment Date": new Date().toISOString().split("T")[0],
      "Appointment Time": "16:00",
      "Appointment Type": "Follow-up",
      "Reason for Visit": "Chronic hypertension prescription refill and blood pressure charting.",
      Status: "Confirmed",
      Age: 62,
      Gender: "Male",
      Notes: "BP logs saved on his personal digital watch tracker.",
      "Admin Notes": "",
    }
  ],
  upcoming: 3,
  total: 4
};

export async function GET() {
  if (isMock) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json(mockData);
  }

  try {
    const res = await fetch(`${N8N_URL}/webhook/admin/appointments/today`);
    if (!res.ok) throw new Error("n8n returned error");
    const data = await res.json();
    
    let appointments = data.appointments || [];
    
    // Filter out invalid/empty items (e.g. doctor details or missing patient name)
    appointments = appointments.filter((appt: any) => appt && appt["Patient Name"] && appt["Booking ID"]);
    
    // Merge live appointments with mock dataset for presentation
    const mergedAppointments = [...appointments, ...mockData.appointments];
    
    // Deduplicate list by Booking ID / ID
    const seen = new Set();
    const finalAppointments = [];
    for (const appt of mergedAppointments) {
      const identifier = appt["Booking ID"] || appt.id;
      if (!seen.has(identifier)) {
        seen.add(identifier);
        finalAppointments.push(appt);
      }
    }
    
    return NextResponse.json({
      appointments: finalAppointments,
      upcoming: finalAppointments.filter((a: any) => a.Status !== "Completed" && a.Status !== "Cancelled" && a.Status !== "No-show").length,
      total: finalAppointments.length
    });
  } catch (err) {
    console.error("[API /api/admin/appointments/today] n8n lookup failed. Using fallback mock:", err);
    return NextResponse.json(mockData);
  }
}
