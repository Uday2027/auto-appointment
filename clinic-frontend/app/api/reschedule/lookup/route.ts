import { NextRequest, NextResponse } from "next/server";
import { fetchN8N, safeJson } from "@/lib/server-api";

const DOCTOR_BY_ID_MAP: Record<string, { id: string; Doctor: string; Specialization: string }> = {
  "recB6hjqfKPcBqK4n": { id: "recB6hjqfKPcBqK4n", Doctor: "Dr. Ayesha Rahman", Specialization: "Cardiology" },
  "recEVkR2Iy7pQ4l6t": { id: "recEVkR2Iy7pQ4l6t", Doctor: "Dr. Imran Hossain", Specialization: "Dermatology" },
  "rec62Q0h3dahB0VIx": { id: "rec62Q0h3dahB0VIx", Doctor: "Dr. Shirin Akter", Specialization: "Neurology" },
  "recBpeli3oohxmiqY": { id: "recBpeli3oohxmiqY", Doctor: "Dr. Mahmudul Hasan", Specialization: "Orthopedics" },
  "recHDNqJR8ex7T06J": { id: "recHDNqJR8ex7T06J", Doctor: "Dr. Tanvir Ahmed", Specialization: "ENT" },
  "recS4YaS7sYwXRMIK": { id: "recS4YaS7sYwXRMIK", Doctor: "Dr. Sabrina Haque", Specialization: "Ophthalmology" },
  "recTspm1eXXVhiVnq": { id: "recTspm1eXXVhiVnq", Doctor: "Dr. Rashedul Islam", Specialization: "General Surgery" },
  "reclIIzxdNh2uZ7pM": { id: "reclIIzxdNh2uZ7pM", Doctor: "Dr. Nusrat Jahan", Specialization: "Pediatrics" },
  "recnF9NfhDZHhYzS1": { id: "recnF9NfhDZHhYzS1", Doctor: "Dr. Farhana Sultana", Specialization: "Gynecology" },
  "recnN5Q33JYAZU647": { id: "recnN5Q33JYAZU647", Doctor: "Dr. Kamrul Hasan", Specialization: "Urology" },
  "recnAIG7ntJgx916l": { id: "recnAIG7ntJgx916l", Doctor: "Dr. General Practitioner", Specialization: "General Practitioner" }
};

export async function POST(req: NextRequest) {
  try {
    const { bookingId, email } = await req.json();
    if (!bookingId || !email) {
      return NextResponse.json({ success: false, message: "Booking ID and email are required" }, { status: 400 });
    }

    const res = await fetchN8N("admin/appointments", { method: "GET" });
    const data = await safeJson(res);
    const appointments = data.appointments || [];

    const normBookingId = bookingId.replace(/\s+/g, "").toLowerCase();
    const normEmail = email.trim().toLowerCase();

    const appt = appointments.find((a: any) => {
      const aBookingId = (a["Booking ID"] || "").replace(/\s+/g, "").toLowerCase();
      const aEmail = (a["Email"] || "").trim().toLowerCase();
      return aBookingId === normBookingId && aEmail === normEmail;
    });

    if (!appt) {
      return NextResponse.json(
        { success: false, message: "Booking not found. Please verify your Booking ID and Email." },
        { status: 404 }
      );
    }

    // Try to find doctor details from the DoctorSchedules link
    let doctorInfo = DOCTOR_BY_ID_MAP["recnAIG7ntJgx916l"]; // Default fallback
    if (Array.isArray(appt.DoctorSchedules)) {
      for (const id of appt.DoctorSchedules) {
        if (DOCTOR_BY_ID_MAP[id]) {
          doctorInfo = DOCTOR_BY_ID_MAP[id];
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      appointment: appt,
      doctor: doctorInfo
    });
  } catch (err) {
    console.error("[API /api/reschedule/lookup] error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error looking up appointment" },
      { status: 500 }
    );
  }
}
