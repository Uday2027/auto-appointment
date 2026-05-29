"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { submitReschedule, lookupAppointment, fetchAvailability, fetchBookedSlots } from "@/lib/api";

interface FormData {
  bookingId: string;
  email: string;
  newDate: string;
  newTime: string;
  reason: string;
}

const initialForm: FormData = {
  bookingId: "",
  email: "",
  newDate: "",
  newTime: "",
  reason: "",
};

export default function ReschedulePage() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [today, setToday] = useState("");

  // Appointment & Doctor states
  const [apptDetails, setApptDetails] = useState<any>(null);
  const [matchedDoctor, setMatchedDoctor] = useState<any>(null);
  const [availabilityList, setAvailabilityList] = useState<any[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [bookedTimes, setBookedTimes] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    setToday(new Date().toISOString().split("T")[0]);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const bookingIdParam = params.get("bookingId");
      if (bookingIdParam) {
        setForm((prev) => ({ ...prev, bookingId: bookingIdParam }));
      }
    }
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

  // Helper date conversions
  const getWeekday = (dateStr: string): string => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

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

  // Lookup appointment & verify patient details
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bookingId.trim()) {
      setErrors((prev) => ({ ...prev, bookingId: "Booking ID is required" }));
      return;
    }
    if (!form.email.trim()) {
      setErrors((prev) => ({ ...prev, email: "Email is required" }));
      return;
    }

    setVerifying(true);
    setGlobalError("");
    try {
      const res = await lookupAppointment(form.bookingId, form.email);
      if (res && res.success && res.appointment) {
        setApptDetails(res.appointment);
        setMatchedDoctor(res.doctor);
        toast.success("Appointment verified! Loading doctor schedules...");

        // Fetch doctor availability using schedule webhook
        setLoadingAvailability(true);
        const availRes = await fetchAvailability([res.doctor]);
        setAvailabilityList(availRes || []);
        setLoadingAvailability(false);

        setVerified(true);
      } else {
        throw new Error(res.message || "Appointment verification failed");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Appointment verification failed";
      toast.error(msg);
      setGlobalError(msg);
    } finally {
      setVerifying(false);
    }
  };

  // Fetch booked slots when a valid date is picked
  const handleDateChange = async (newDate: string) => {
    updateField("newDate", newDate);
    updateField("newTime", "");
    setBookedTimes([]);

    if (!newDate) return;

    const weekday = getWeekday(newDate);
    const activeSchedule = availabilityList.find(
      (item) => item.fields["Day of Week"] === weekday
    );

    if (activeSchedule && activeSchedule.fields["Availability Status"] === "Available") {
      setLoadingSlots(true);
      try {
        const slotsRes = await fetchBookedSlots({
          "Day of Week": weekday,
          "Start Time": activeSchedule.fields["Start Time"],
          "End Time": activeSchedule.fields["End Time"],
          Date: formatDateToDDMMYYYY(newDate),
        });
        
        // Parse booked times
        const times: string[] = (slotsRes || [])
          .map((b: any) => {
            if (typeof b === "string") return b;
            return b["Appointment Time"] || b.fields?.["Appointment Time"] || b.time || "";
          })
          .filter(Boolean);
          
        setBookedTimes(times);
      } catch (err) {
        console.error("Failed to query booked slots:", err);
        setBookedTimes([]);
      } finally {
        setLoadingSlots(false);
      }
    }
  };

  // Determine active availability slots for selected date
  const selectedWeekday = getWeekday(form.newDate);
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

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof FormData, string>> = {};

    if (!form.bookingId.trim()) nextErrors.bookingId = "Booking ID is required";
    if (!form.email.trim()) nextErrors.email = "Email is required";
    if (!form.newDate) {
      nextErrors.newDate = "New date is required";
    } else if (form.newDate < today) {
      nextErrors.newDate = "New date cannot be in the past";
    }
    if (!form.newTime) nextErrors.newTime = "New time slot is required";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGlobalError("");
    try {
      const result = await submitReschedule(form);
      console.log("[RescheduleForm] n8n response:", result);
      toast.success(result.message || "Appointment rescheduled successfully!");
      setSuccess(true);
      setForm(initialForm);
      setVerified(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(msg);
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

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
            Appointment Rescheduled
          </h2>
          <p className="mb-8 text-slate-350 leading-relaxed text-sm">
            Your appointment has been successfully rescheduled in the calendar database. A confirmation email with the new timing has been dispatched.
          </p>
          <button
            onClick={() => setSuccess(false)}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-8 py-3.5 font-bold text-slate-950 transition-all hover:opacity-90 hover:shadow-lg hover:shadow-cyan-500/20"
          >
            Reschedule Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="clinic-pattern min-h-screen pb-16">
      <div className="mx-auto max-w-2xl px-6 py-12 md:py-20">
        
        <div className="mb-8 text-center">
          <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-400 inline-block mb-3">
            Self Service Portal
          </span>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-white md:text-4xl">
            Reschedule Appointment
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Update your scheduled calendar slot by submitting your booking parameters.
          </p>
        </div>

        {globalError && (
          <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-50/5 p-4 text-xs text-rose-450">
            {globalError}
          </div>
        )}

        {/* Phase 1: Verification Form */}
        {!verified ? (
          <form
            onSubmit={handleVerify}
            className="animate-fade-in-up rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-xl shadow-black/10 md:p-10"
          >
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Booking ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.bookingId}
                  onChange={(e) => updateField("bookingId", e.target.value)}
                  placeholder="e.g. BK-1234567-123"
                  className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 font-mono ${
                    errors.bookingId ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                  }`}
                />
                {errors.bookingId && <p className="mt-1 text-[10px] text-rose-400">{errors.bookingId}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  Verify Email Address <span className="text-rose-400">*</span>
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
            </div>

            <div className="mt-8">
              <button
                type="submit"
                disabled={verifying}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-8 py-3.5 font-bold text-slate-950 transition-all hover:opacity-90 hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {verifying ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-slate-950" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying Booking...
                  </>
                ) : (
                  <>Verify Appointment</>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Phase 2: Active Rescheduling Calendar & Slots */
          <form
            onSubmit={handleSubmit}
            className="animate-fade-in-up rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-xl shadow-black/10 md:p-10 space-y-6"
          >
            {/* Current Appointment Summary Card */}
            <div className="rounded-xl border border-cyan-500/10 bg-cyan-950/20 p-5 space-y-3">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Current Scheduled Details</h3>
              <div className="grid gap-3 text-xs md:grid-cols-2">
                <div>
                  <span className="text-slate-400 block mb-0.5">Specialist</span>
                  <span className="font-semibold text-white">{matchedDoctor?.Doctor || "Dr. General Practitioner"} ({matchedDoctor?.Specialization || "General Practitioner"})</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Booking ID</span>
                  <span className="font-semibold text-white font-mono">{apptDetails?.["Booking ID"]}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Current Date</span>
                  <span className="font-semibold text-white">{apptDetails?.["Appointment Date"]}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Current Time</span>
                  <span className="font-semibold text-white">{apptDetails?.["Appointment Time"]}</span>
                </div>
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Select New Appointment Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                min={today}
                value={form.newDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-xs text-white [color-scheme:dark] ${
                  errors.newDate ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                }`}
              />
              {errors.newDate && <p className="mt-1 text-[10px] text-rose-400">{errors.newDate}</p>}
            </div>

            {/* Availability Slots Grid */}
            {form.newDate && (
              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-300">
                  Select New Time Slot <span className="text-rose-400">*</span>
                </label>
                
                {loadingSlots ? (
                  <div className="py-8 text-center text-xs text-slate-500 animate-pulse">
                    Querying live slots...
                  </div>
                ) : !isAvailableDay ? (
                  <div className="rounded-xl border border-rose-500/10 bg-rose-950/10 p-4 text-xs text-rose-350 text-center">
                    {matchedDoctor?.Doctor || "The doctor"} is not available on <strong>{selectedWeekday}s</strong>. Please choose another date.
                  </div>
                ) : availableTimeSlots.length === 0 ? (
                  <div className="rounded-xl border border-rose-500/10 bg-rose-950/10 p-4 text-xs text-rose-350 text-center">
                    All slots are booked for this date. Please choose a different date.
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
                    {availableTimeSlots.map((slot) => {
                      const isSelected = form.newTime === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => updateField("newTime", slot)}
                          className={`rounded-xl border py-2.5 text-center text-xs font-semibold transition-all duration-200 ${
                            isSelected
                              ? "border-cyan-400 bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/10"
                              : "border-white/5 bg-slate-950/40 text-slate-300 hover:border-cyan-500/40 hover:text-white"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.newTime && <p className="mt-1.5 text-[10px] text-rose-400">{errors.newTime}</p>}
              </div>
            )}

            {/* Reason for Rescheduling */}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Reason for Rescheduling <span className="text-slate-500 font-normal font-sans">(optional)</span>
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => updateField("reason", e.target.value)}
                placeholder="Brief reason for rescheduling the session..."
                rows={3}
                className="w-full rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500"
              />
            </div>

            {/* Submit & Reset Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  setVerified(false);
                  setAvailabilityList([]);
                  setForm(initialForm);
                }}
                className="rounded-xl border border-white/5 bg-slate-950/40 px-5 text-xs font-bold text-slate-450 transition-all hover:bg-slate-950/80 hover:text-white"
              >
                Reset Verification
              </button>
              
              <button
                type="submit"
                disabled={loading || !form.newTime}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 py-3.5 font-bold text-slate-950 transition-all hover:opacity-90 hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-slate-950" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Rescheduling...
                  </>
                ) : (
                  <>Confirm Reschedule</>
                )}
              </button>
            </div>

            <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 text-[10px] text-slate-450 leading-relaxed">
              <p className="font-bold text-white mb-1">Rescheduling Window Policy</p>
              <p>Self-service adjustments are locked starting 3 hours before the appointment slot. For urgent conflicts, please reach clinic front desk personnel directly at 01711000000.</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
