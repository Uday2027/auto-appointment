"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { 
  submitBooking, 
  fetchAvailableDoctors, 
  fetchAvailability, 
  fetchBookedSlots 
} from "@/lib/api";

const appointmentTypes = [
  "New Consultation",
  "Follow-up",
  "Report Review",
  "Emergency / Urgent",
];

const genderOptions = ["Male", "Female", "Other"];

interface FormData {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  appointmentType: string;
  reason: string;
  age: string;
  gender: string;
  notes: string;
  consent: boolean;
}

const initialForm: FormData = {
  name: "",
  email: "",
  phone: "",
  date: "",
  time: "",
  appointmentType: "",
  reason: "",
  age: "",
  gender: "",
  notes: "",
  consent: false,
};

interface DoctorMatch {
  success: boolean;
  id: string;
  Specialization: string;
  Doctor: string;
}

interface AvailabilityItem {
  id: string;
  createdTime: string;
  fields: {
    "Day of Week": string;
    "Start Time"?: string;
    "End Time"?: string;
    "Availability Status": string;
    "Doctor": string[];
    "Availability Name"?: string;
    "Notes"?: string;
  };
}

export default function BookingPage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [today, setToday] = useState("");

  // Step Wizard State
  const [step, setStep] = useState(1);
  const [matchedDoctor, setMatchedDoctor] = useState<DoctorMatch | null>(null);
  const [availabilityList, setAvailabilityList] = useState<AvailabilityItem[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
  }, []);

  const updateField = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setGlobalError("");
  }, []);

  // Helper: Get weekday name from YYYY-MM-DD
  const getWeekday = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[d.getDay()];
  };

  // Helper: Format YYYY-MM-DD to DD-MM-YYYY
  const formatDateToDDMMYYYY = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // Helper: Generate 30-min slots
  const generateSlots = (startTime: string, endTime: string) => {
    const slots: string[] = [];
    try {
      let [startH, startM] = startTime.split(":").map(Number);
      const [endH, endM] = endTime.split(":").map(Number);
      
      let currentMin = startH * 60 + startM;
      const limitMin = endH * 60 + endM;
      
      while (currentMin < limitMin) {
        const h = Math.floor(currentMin / 60);
        const m = currentMin % 60;
        slots.push(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
        );
        currentMin += 30;
      }
    } catch (e) {
      console.error("Error generating slots:", e);
    }
    return slots;
  };

  // Step 1: Submit symptoms to find doctor
  const handleFindDoctor = async () => {
    if (!form.reason.trim()) {
      setErrors({ reason: "Please describe your symptoms or medical concern" });
      return;
    }

    setLoading(true);
    setGlobalError("");
    try {
      const res = await fetchAvailableDoctors(form.reason);
      if (res && res.success && res.id) {
        setMatchedDoctor(res);
        toast.success(`Matched specialist: ${res.Doctor} (${res.Specialization})`);
        
        // Auto-fetch availability for Step 2
        setLoadingAvailability(true);
        const availRes = await fetchAvailability([
          { id: res.id, Specialization: res.Specialization, Doctor: res.Doctor }
        ]);
        setAvailabilityList(availRes || []);
        setLoadingAvailability(false);

        setStep(2);
      } else {
        throw new Error("No doctor matched for this criteria. Please try describing different symptoms.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Doctor lookup failed");
      setGlobalError(err instanceof Error ? err.message : "Doctor lookup failed");
    } finally {
      setLoading(false);
      setLoadingAvailability(false);
    }
  };

  // Trigger booked slots query when date changes in Step 3
  const handleDateChange = async (selectedDate: string) => {
    updateField("date", selectedDate);
    updateField("time", "");
    setBookedTimes([]);

    if (!selectedDate || !matchedDoctor) return;

    const weekday = getWeekday(selectedDate);
    // Find availability configuration for this weekday
    const schedule = availabilityList.find(
      (item) => item.fields["Day of Week"] === weekday
    );

    if (!schedule || schedule.fields["Availability Status"] !== "Available") {
      return; // UI will display a warning that the doctor is unavailable
    }

    setLoadingSlots(true);
    try {
      // HitbookedSlot webhook
      const res = await fetchBookedSlots({
        "Day of Week": weekday,
        "Start Time": schedule.fields["Start Time"],
        "End Time": schedule.fields["End Time"],
        Date: formatDateToDDMMYYYY(selectedDate),
      });

      // Parse booked times
      const times: string[] = (res || [])
        .map((b: any) => {
          if (typeof b === "string") return b;
          return b["Appointment Time"] || b.fields?.["Appointment Time"] || b.time || "";
        })
        .filter(Boolean);

      setBookedTimes(times);
    } catch (err) {
      console.error("Failed to query booked slots, using default free hours:", err);
      setBookedTimes([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Validation for Step 4 details
  const validateFinalForm = (): boolean => {
    const nextErrors: Partial<Record<keyof FormData, string>> = {};

    if (!form.name.trim()) nextErrors.name = "Patient name is required";
    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Please enter a valid email";
    }
    if (!form.phone.trim()) nextErrors.phone = "Phone number is required";
    if (!form.appointmentType) nextErrors.appointmentType = "Please select appointment type";
    if (!form.age) {
      nextErrors.age = "Age is required";
    } else if (Number(form.age) < 0 || Number(form.age) > 120) {
      nextErrors.age = "Please enter a valid age (0-120)";
    }
    if (!form.gender) nextErrors.gender = "Please select gender";
    if (!form.consent) nextErrors.consent = "You must agree to proceed";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Final Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFinalForm()) return;

    setLoading(true);
    setGlobalError("");
    try {
      // Append matching doctor metadata so n8n can register bookings correctly
      const payload = {
        ...form,
        Doctor: matchedDoctor?.Doctor,
        DoctorId: matchedDoctor?.id,
        Specialization: matchedDoctor?.Specialization,
      };

      const result = await submitBooking(payload);
      console.log("[BookingForm] n8n response:", result);
      toast.success(result.message || "Appointment confirmed!");
      setSuccess(true);
      
      // Reset State
      setForm(initialForm);
      setMatchedDoctor(null);
      setAvailabilityList([]);
      setBookedTimes([]);
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(msg);
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Determine active availability slots for selected date in Step 3
  const selectedWeekday = getWeekday(form.date);
  const activeSchedule = availabilityList.find(
    (item) => item.fields["Day of Week"] === selectedWeekday
  );
  const isAvailableDay = activeSchedule?.fields["Availability Status"] === "Available";

  let generatedTimeSlots: string[] = [];
  if (isAvailableDay && activeSchedule) {
    generatedTimeSlots = generateSlots(
      activeSchedule.fields["Start Time"] || "09:00",
      activeSchedule.fields["End Time"] || "17:00"
    );
  }

  // Filter out slots that match first 5 chars of bookedTimes
  const availableTimeSlots = generatedTimeSlots.filter((slot) => {
    return !bookedTimes.some((b) => b.substring(0, 5) === slot.substring(0, 5));
  });

  if (success) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <div className="animate-fade-in-up rounded-2xl border border-emerald-500/20 bg-[#0d1c18]/80 backdrop-blur-md p-10 text-center shadow-2xl shadow-emerald-950/20">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-lg shadow-emerald-500/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="mb-3 font-serif text-3xl font-bold text-white">
            Appointment Received
          </h2>
          <p className="mb-8 text-slate-300 leading-relaxed text-sm">
            Thank you for booking with MedCare Clinic. Your request has been queued in our **n8n automation pipeline**. A confirmation email will be sent to your inbox as soon as Airtable and Google Calendar are synchronized.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-8 py-3.5 font-bold text-slate-950 transition-all hover:opacity-90 hover:shadow-lg hover:shadow-cyan-500/20"
          >
            Book Another Appointment
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="clinic-pattern min-h-screen pb-16">
      
      {/* Hero Banner Section */}
      <div className="mx-auto max-w-7xl px-6 pt-12 md:pt-20 text-center">
        <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#06b6d4] inline-block mb-4">
          Online Appointment Portal
        </span>
        <h1 className="font-serif text-4xl font-extrabold tracking-tight text-white md:text-5xl lg:text-6xl max-w-4xl mx-auto leading-tight bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
          State-of-the-Art Medical Consultations
        </h1>
        <p className="mt-4 mx-auto max-w-2xl text-sm md:text-base text-slate-400 leading-relaxed">
          Book an appointment using our automated diagnosis flow. Simply state your medical symptoms to match with a specialist, query their live schedule, and select an open time slot.
        </p>
      </div>

      {/* Main Split Grid */}
      <div className="mx-auto max-w-7xl px-6 py-12 grid gap-8 lg:grid-cols-12 items-start">
        
        {/* Left Side: Doctor Card & System Flow Details (col-span-5) */}
        <div className="lg:col-span-5 space-y-6 order-2 lg:order-1">
          
          {/* Ibn Sina Diagnostic Center Card */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-xl shadow-black/10">
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-inner">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 21h18" />
                  <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
                  <path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" />
                  <path d="M10 9h4" />
                  <path d="M12 7v4" />
                </svg>
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-white">Ibn Sina Diagnostic Center</h3>
                <p className="text-xs font-semibold text-cyan-400 mt-0.5">Doyagonj, Dhaka</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-amber-400 font-bold text-xs flex items-center gap-0.5">
                    ★ ★ ★ ★ ★
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">(Premium Health Partner)</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-slate-300 leading-relaxed border-t border-white/5 pt-4">
              Providing state-of-the-art diagnostic and imaging services. Directly integrated with our automated n8n booking and medical matching engine for seamless specialist appointments.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-300">
              <div className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2 border border-white/5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Doyagonj Branch
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2 border border-white/5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Specialist Consultations
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2 border border-white/5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Advanced Cardiac Scans
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-950/40 p-2 border border-white/5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Online Reports Portal
              </div>
            </div>
          </div>

          {/* n8n Automation Engine Flow Map */}
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-xl shadow-black/10 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white">n8n Automation Pipeline</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Behind the scenes, your booking request triggers an automated flow:</p>
            </div>
            
            <div className="relative space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5 pl-7">
              {[
                { title: "Next.js Portal Trigger", desc: "Your booking request is securely posted to the n8n endpoint.", dot: "bg-cyan-500 ring-cyan-950/50" },
                { title: "Airtable Database Registration", desc: "Data schema is validated & formatted records are saved in Airtable DB.", dot: "bg-indigo-500 ring-indigo-950/50" },
                { title: "Google Calendar Blockout", desc: "An event is dynamically blocked on the clinic calendar for 20 mins.", dot: "bg-emerald-500 ring-emerald-950/50" },
                { title: "Gmail Transactional Alerts", desc: "Confirmation, reschedule links, and receptionist notices are sent.", dot: "bg-rose-500 ring-rose-950/50" },
                { title: "Scheduled Reminders (24h/2h)", desc: "Autonomous cron tasks query due bookings and dispatch reminders.", dot: "bg-violet-500 ring-violet-950/50" }
              ].map((step, idx) => (
                <div key={idx} className="relative text-xs">
                  <div className={`absolute -left-7 top-1 h-2.5 w-2.5 rounded-full border border-slate-950 ring-4 ${step.dot} z-10`} />
                  <p className="font-semibold text-white">{step.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Side: Appointment Booking Wizard (col-span-7) */}
        <div className="lg:col-span-7 order-1 lg:order-2">
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-xl shadow-black/10 md:p-10">
            
            {/* Step Wizard Stepper Progress bar */}
            <div className="mb-8 border-b border-white/5 pb-6">
              <div className="flex items-center justify-between">
                {[
                  { id: 1, label: "Diagnose" },
                  { id: 2, label: "Doctor" },
                  { id: 3, label: "Schedule" },
                  { id: 4, label: "Contact" }
                ].map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span 
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                        step === s.id
                          ? "bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/20"
                          : step > s.id
                          ? "bg-cyan-950/40 border border-cyan-400/30 text-cyan-400"
                          : "bg-slate-950/40 border border-white/5 text-slate-500"
                      }`}
                    >
                      {s.id}
                    </span>
                    <span 
                      className={`text-xs font-semibold hidden sm:inline ${
                        step === s.id ? "text-white" : "text-slate-500"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {globalError && (
              <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-450">
                {globalError}
              </div>
            )}

            {/* STEP 1: SYMPTOMS INTAKE */}
            {step === 1 && (
              <div className="space-y-6 animate-fade-in-up">
                <div>
                  <h3 className="font-serif text-xl font-bold text-white mb-1">Step 1: Clinical Symptoms</h3>
                  <p className="text-xs text-slate-400">Describe your symptoms to run our automation doctor matching script.</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    What symptoms or problems are you experiencing? <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={form.reason}
                    onChange={(e) => updateField("reason", e.target.value)}
                    placeholder="Describe chest pains, breathing difficulties, coughs, rashes, or other symptoms in detail..."
                    rows={4}
                    className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 ${
                      errors.reason ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                    }`}
                  />
                  {errors.reason && <p className="mt-1 text-[10px] text-rose-400">{errors.reason}</p>}
                </div>

                <button
                  type="button"
                  onClick={handleFindDoctor}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-8 py-3.5 font-bold text-slate-950 transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? "Analyzing Symptoms..." : "Find Matched Doctors"}
                </button>
              </div>
            )}

            {/* STEP 2: DOCTOR SELECTION & WEEKLY CALENDAR */}
            {step === 2 && matchedDoctor && (
              <div className="space-y-6 animate-fade-in-up">
                <div>
                  <h3 className="font-serif text-xl font-bold text-white mb-1">Step 2: Recommended Specialist</h3>
                  <p className="text-xs text-slate-400">We matched your symptoms to our medical department.</p>
                </div>

                {/* Match Card */}
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                      {matchedDoctor.Specialization}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">ID: {matchedDoctor.id}</span>
                  </div>
                  <h4 className="text-lg font-bold text-white">{matchedDoctor.Doctor}</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    This practitioner handles symptoms matching your input. Query below to see their active schedule in Airtable.
                  </p>
                </div>

                {/* Weekly Schedule Display */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">Weekly Clinical Hours:</label>
                  {loadingAvailability ? (
                    <div className="py-8 text-center text-xs text-slate-500 animate-pulse">Loading clinic schedules...</div>
                  ) : availabilityList.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-500 border border-white/5 rounded-xl bg-slate-950/20">No schedule loaded.</div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {availabilityList.map((item) => {
                        const isAvail = item.fields["Availability Status"] === "Available";
                        return (
                          <div 
                            key={item.id} 
                            className={`rounded-xl border p-3 flex flex-col justify-between text-xs transition-colors ${
                              isAvail 
                                ? "border-white/5 bg-slate-950/30" 
                                : "border-rose-900/10 bg-rose-950/5 opacity-55"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{item.fields["Day of Week"]}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                isAvail ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                              }`}>
                                {item.fields["Availability Status"]}
                              </span>
                            </div>
                            {isAvail ? (
                              <p className="text-cyan-400 font-semibold mt-1.5 font-mono">
                                {item.fields["Start Time"]} - {item.fields["End Time"]}
                              </p>
                            ) : (
                              <p className="text-slate-500 mt-1.5 italic truncate">{item.fields["Notes"] || "Clinic closed."}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-xs font-semibold text-slate-400 hover:bg-slate-900"
                  >
                    Back to Symptoms
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-4 py-3 text-xs font-bold text-slate-950 hover:opacity-90"
                  >
                    Select Date & Time
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: DATE & TIME SELECTOR WITH BOOKING EXCLUSIONS */}
            {step === 3 && matchedDoctor && (
              <div className="space-y-6 animate-fade-in-up">
                <div>
                  <h3 className="font-serif text-xl font-bold text-white mb-1">Step 3: Appointment Slot</h3>
                  <p className="text-xs text-slate-400">Select a day of week corresponding to {matchedDoctor.Doctor}'s schedule.</p>
                </div>

                {/* Date Input */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">
                    Appointment Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={form.date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3 text-xs text-white [color-scheme:dark] focus:border-cyan-500"
                  />
                  {form.date && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Weekday: <span className="font-bold text-cyan-400">{selectedWeekday}</span>
                    </p>
                  )}
                </div>

                {/* Warning / Time slots Grid */}
                {form.date && (
                  <div className="space-y-3">
                    {!activeSchedule ? (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-400">
                        We don't have schedule rules for {selectedWeekday}s. Please choose an available day.
                      </div>
                    ) : !isAvailableDay ? (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs text-rose-400">
                        {matchedDoctor.Doctor} is not available on {selectedWeekday}s. Note: {activeSchedule.fields["Notes"] || "Closed."}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">
                          Select an Available Time Slot (30-min intervals): <span className="text-rose-400">*</span>
                        </label>
                        {loadingSlots ? (
                          <div className="py-6 text-center text-xs text-slate-500 animate-pulse">Querying booked slots...</div>
                        ) : availableTimeSlots.length === 0 ? (
                          <div className="py-4 text-center text-xs text-rose-400 border border-rose-900/10 bg-rose-950/5 rounded-xl">
                            All slots are booked for this date. Please choose a different date.
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {availableTimeSlots.map((slot) => {
                              const isSelected = form.time === slot;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => updateField("time", slot)}
                                  className={`rounded-xl border py-2.5 text-xs font-bold font-mono transition-all ${
                                    isSelected
                                      ? "border-cyan-400 bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/25"
                                      : "border-white/5 bg-slate-950/40 text-slate-350 hover:border-slate-700 hover:text-white"
                                  }`}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {errors.time && <p className="mt-1 text-[10px] text-rose-400">{errors.time}</p>}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-xs font-semibold text-slate-400 hover:bg-slate-900"
                  >
                    Back to Doctor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.date) {
                        toast.error("Please pick an appointment date");
                        return;
                      }
                      if (!isAvailableDay) {
                        toast.error("Doctor is not available on this date");
                        return;
                      }
                      if (!form.time) {
                        toast.error("Please pick a time slot");
                        return;
                      }
                      setStep(4);
                    }}
                    disabled={!form.date || !isAvailableDay || !form.time}
                    className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-4 py-3 text-xs font-bold text-slate-950 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Enter Demographics
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: PATIENT CONTACT & COMPLETE */}
            {step === 4 && matchedDoctor && (
              <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in-up">
                <div>
                  <h3 className="font-serif text-xl font-bold text-white mb-1">Step 4: Contact Information</h3>
                  <p className="text-xs text-slate-400">
                    Scheduling <span className="text-cyan-400 font-bold">{form.time}</span> on <span className="text-cyan-400 font-bold">{form.date}</span> with {matchedDoctor.Doctor}.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  {/* Name */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Patient Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="e.g. Ahmed Rahman"
                      className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 ${
                        errors.name ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                      }`}
                    />
                    {errors.name && <p className="mt-1 text-[10px] text-rose-400">{errors.name}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Email Address <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="you@email.com"
                      className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 ${
                        errors.email ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                      }`}
                    />
                    {errors.email && <p className="mt-1 text-[10px] text-rose-400">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="e.g. 01711000000"
                      className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 ${
                        errors.phone ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                      }`}
                    />
                    {errors.phone && <p className="mt-1 text-[10px] text-rose-400">{errors.phone}</p>}
                  </div>

                  {/* Appointment Type */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Appointment Type <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={form.appointmentType}
                      onChange={(e) => updateField("appointmentType", e.target.value)}
                      className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3.5 text-xs text-white ${
                        errors.appointmentType ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                      }`}
                    >
                      <option value="" className="bg-slate-900 text-slate-400">Select type...</option>
                      {appointmentTypes.map((t) => (
                        <option key={t} value={t} className="bg-slate-900 text-white">{t}</option>
                      ))}
                    </select>
                    {errors.appointmentType && (
                      <p className="mt-1 text-[10px] text-rose-400">{errors.appointmentType}</p>
                    )}
                  </div>

                  {/* Age */}
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Age <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={form.age}
                      onChange={(e) => updateField("age", e.target.value)}
                      placeholder="e.g. 32"
                      className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 ${
                        errors.age ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                      }`}
                    />
                    {errors.age && <p className="mt-1 text-[10px] text-rose-400">{errors.age}</p>}
                  </div>

                  {/* Gender */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Gender <span className="text-rose-400">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {genderOptions.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => updateField("gender", g)}
                          className={`rounded-xl border py-2.5 text-xs font-semibold transition-all duration-205 ${
                            form.gender === g
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 font-bold"
                              : "border-white/5 bg-slate-950/30 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                    {errors.gender && <p className="mt-1 text-[10px] text-rose-400">{errors.gender}</p>}
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-slate-300">
                      Additional Notes <span className="text-slate-500 font-normal font-sans">(optional)</span>
                    </label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => updateField("notes", e.target.value)}
                      placeholder="Any allergies, current medications, or special patient assistance requests..."
                      rows={2}
                      className="w-full rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500"
                    />
                  </div>

                  {/* Consent */}
                  <div className="md:col-span-2 mt-2">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={form.consent}
                        onChange={(e) => updateField("consent", e.target.checked)}
                        className="mt-0.5 h-4.5 w-4.5 rounded border-white/5 bg-slate-950 text-cyan-500 accent-cyan-500 focus:ring-cyan-500/20"
                      />
                      <span className="text-[11px] leading-relaxed text-slate-400">
                        I consent to MedCare Clinic collecting and registering my personal details inside Airtable and Google Calendar for scheduled appointment logistics. I understand my contact info will be used to send automated reminder notifications.
                      </span>
                    </label>
                    {errors.consent && <p className="mt-1 text-[10px] text-rose-400">{errors.consent}</p>}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 rounded-xl border border-white/5 bg-slate-950 px-4 py-3 text-xs font-semibold text-slate-400 hover:bg-slate-900"
                  >
                    Back to Schedule
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-8 py-3.5 font-bold text-slate-950 transition-all hover:opacity-90 hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? "Confirming..." : "Request Appointment"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
