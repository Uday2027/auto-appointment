"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { submitCancellation } from "@/lib/api";

interface FormData {
  bookingId: string;
  email: string;
  reason: string;
}

export default function CancelPage() {
  const params = useParams();
  const rawBookingId = params.bookingId ? (params.bookingId as string) : "";
  const decodedBookingId = decodeURIComponent(rawBookingId);

  const [form, setForm] = useState<FormData>({
    bookingId: decodedBookingId,
    email: "",
    reason: "",
  });

  // Sync booking ID if it changes or gets resolved later
  useEffect(() => {
    if (decodedBookingId) {
      setForm((prev) => ({ ...prev, bookingId: decodedBookingId }));
    }
  }, [decodedBookingId]);

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState("");

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

    if (!form.bookingId.trim()) {
      nextErrors.bookingId = "Booking ID is missing from URL";
    }
    if (!form.email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      nextErrors.email = "Please enter a valid email";
    }
    if (!form.reason.trim()) {
      nextErrors.reason = "Please provide a reason for cancellation";
    } else if (form.reason.trim().length < 5) {
      nextErrors.reason = "Cancellation reason must be at least 5 characters";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setGlobalError("");
    try {
      const result = await submitCancellation(form);
      console.log("[CancelForm] n8n response:", result);
      toast.success(result.message || "Appointment successfully cancelled");
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to cancel appointment. Please verify details.";
      toast.error(msg);
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20">
        <div className="animate-fade-in-up rounded-2xl border border-rose-500/20 bg-[#1c0d0d]/80 backdrop-blur-md p-10 text-center shadow-2xl shadow-rose-950/20">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 to-red-400 shadow-lg shadow-rose-500/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
          <h2 className="mb-3 font-serif text-3xl font-bold text-white">
            Appointment Cancelled
          </h2>
          <p className="mb-8 text-slate-350 leading-relaxed text-sm">
            Your appointment has been successfully deleted from our system calendar. A confirmation receipt has been sent to your inbox.
          </p>
          <a
            href="/"
            className="inline-block rounded-xl bg-gradient-to-r from-rose-500 to-red-450 px-8 py-3.5 font-bold text-slate-950 transition-all hover:opacity-90 hover:shadow-lg hover:shadow-rose-500/20"
          >
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="clinic-pattern min-h-screen pb-16">
      <div className="mx-auto max-w-xl px-6 py-12 md:py-20">
        
        <div className="mb-8 text-center">
          <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-rose-400 inline-block mb-3">
            Cancellation Desk
          </span>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-white md:text-4xl">
            Cancel Appointment
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Confirm your booking parameters below to withdraw your reservation.
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
                Booking ID
              </label>
              <input
                type="text"
                value={form.bookingId}
                disabled
                className="w-full rounded-xl border border-white/5 bg-slate-950/20 px-4 py-3 text-xs text-slate-500 cursor-not-allowed font-mono"
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
                placeholder="Enter email used for booking"
                className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 ${
                  errors.email ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                }`}
              />
              {errors.email && <p className="mt-1 text-[10px] text-rose-400">{errors.email}</p>}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Reason for Cancellation <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={form.reason}
                onChange={(e) => updateField("reason", e.target.value)}
                placeholder="Please describe why you need to cancel this appointment..."
                rows={4}
                className={`w-full rounded-xl border bg-slate-950/40 px-4 py-3 text-xs text-white placeholder:text-slate-500 ${
                  errors.reason ? "border-rose-400 focus:border-rose-400" : "border-white/5 focus:border-cyan-500"
                }`}
              />
              {errors.reason && <p className="mt-1 text-[10px] text-rose-400">{errors.reason}</p>}
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-8 py-3.5 font-bold text-white transition-all hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>Cancel Appointment</>
              )}
            </button>
            <a
              href="/"
              className="text-center text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              Keep My Appointment
            </a>
          </div>

          <div className="mt-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-[10px] text-rose-350 leading-relaxed">
            <p className="font-bold text-rose-400 mb-1">Cancellation Window Notice</p>
            <p>Appointments scheduled within the next 3 hours are locked and must be cancelled by contacting clinic reception directly to open up the slot for waitlisted cases.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
