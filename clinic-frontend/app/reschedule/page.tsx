"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { submitReschedule } from "@/lib/api";

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
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [today, setToday] = useState("");

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

  const validate = (): boolean => {
    const nextErrors: Partial<Record<keyof FormData, string>> = {};

    if (!form.bookingId.trim()) nextErrors.bookingId = "Booking ID is required";
    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Please enter a valid email";
    }
    if (!form.newDate) {
      nextErrors.newDate = "New date is required";
    } else if (form.newDate < today) {
      nextErrors.newDate = "New date cannot be in the past";
    }
    if (!form.newTime) nextErrors.newTime = "New time is required";

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
      toast.success(result.message || "Appointment rescheduled!");
      setSuccess(true);
      setForm(initialForm);
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
      <div className="mx-auto max-w-xl px-6 py-12 md:py-20">
        
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

        <form
          onSubmit={handleSubmit}
          className="animate-fade-in-up rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-xl shadow-black/10 md:p-10"
          style={{ animationDelay: "0.1s" }}
        >
          {globalError && (
            <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-50/5 p-4 text-xs text-rose-450">
              {globalError}
            </div>
          )}

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

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  New Appt Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  min={today}
                  value={form.newDate}
                  onChange={(e) => updateField("newDate", e.target.value)}
                  className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-xs text-white [color-scheme:dark] ${
                    errors.newDate ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                  }`}
                />
                {errors.newDate && <p className="mt-1 text-[10px] text-rose-400">{errors.newDate}</p>}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">
                  New Appt Time <span className="text-rose-400">*</span>
                </label>
                <input
                  type="time"
                  value={form.newTime}
                  onChange={(e) => updateField("newTime", e.target.value)}
                  className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-xs text-white [color-scheme:dark] ${
                    errors.newTime ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                  }`}
                />
                {errors.newTime && <p className="mt-1 text-[10px] text-rose-400">{errors.newTime}</p>}
              </div>
            </div>

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
          </div>

          <div className="mt-8">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-8 py-3.5 font-bold text-slate-950 transition-all hover:opacity-90 hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-slate-950" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>Confirm Reschedule</>
              )}
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-white/5 bg-slate-950/40 p-4 text-[10px] text-slate-450 leading-relaxed">
            <p className="font-bold text-white mb-1">Rescheduling Window Policy</p>
            <p>Self-service adjustments are locked starting 3 hours before the appointment slot. For urgent conflicts, please reach clinic front desk personnel directly at 01711000000.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
