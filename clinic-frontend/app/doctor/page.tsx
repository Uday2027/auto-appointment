"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { fetchTodayAppointments, updateStatus } from "@/lib/api";

interface Appointment {
  id: string;
  "Booking ID": string;
  "Patient Name": string;
  Email: string;
  Phone: string;
  "Appointment Date": string;
  "Appointment Time": string;
  "Appointment Type": string;
  "Reason for Visit": string;
  Status: string;
  Age: number;
  Gender: string;
  Notes: string;
  "Admin Notes": string;
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  Booked: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
  Confirmed: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  Completed: { bg: "bg-slate-500/10", text: "text-slate-400", dot: "bg-slate-400" },
  Cancelled: { bg: "bg-rose-500/10", text: "text-rose-400", dot: "bg-rose-400" },
  "No-show": { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
  Rescheduled: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
};

export default function DoctorPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcoming, setUpcoming] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [todayLabel, setTodayLabel] = useState("");

  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchTodayAppointments();
      setAppointments(data.appointments || []);
      setUpcoming(data.upcoming || 0);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [loadData, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="clinic-pattern min-h-screen flex items-center justify-center px-6 py-20">
        <div className="w-full max-w-md rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-8 shadow-2xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="font-serif text-2xl font-bold text-white mb-2">Doctor Security</h2>
          <p className="text-xs text-slate-400 mb-6">Enter the practitioner passcode to access the consultation portal.</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (passcode === "doctor123") {
              setIsAuthenticated(true);
              setAuthError("");
            } else {
              setAuthError("Incorrect passcode. Access Denied.");
            }
          }} className="space-y-4">
            <div>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter doctor passcode"
                className="w-full rounded-xl border border-white/5 bg-slate-950/40 px-4 py-3 text-sm text-white text-center tracking-widest placeholder:tracking-normal placeholder:text-slate-500 focus:border-cyan-500"
              />
              {authError && <p className="mt-2 text-xs text-rose-450">{authError}</p>}
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 py-3 font-bold text-slate-950 transition-all hover:opacity-90"
            >
              Verify & Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  const handleComplete = async (recordId: string) => {
    setUpdatingId(recordId);
    try {
      const result = await updateStatus(recordId, "Completed", doctorNotes);
      setAppointments((prev) =>
        prev.map((a) => (a.id === recordId ? { ...a, Status: "Completed", "Admin Notes": doctorNotes } : a))
      );
      setSelectedAppt(null);
      setDoctorNotes("");
      toast.success(`Marked as ${result.status || "Completed"}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const sorted = [...appointments].sort((a, b) => {
    const timeA = a["Appointment Time"] || "";
    const timeB = b["Appointment Time"] || "";
    return timeA.localeCompare(timeB);
  });

  // Segregate appointments for EHR dashboard columns
  const activeAppts = sorted.filter(a => a.Status !== "Completed" && a.Status !== "Cancelled" && a.Status !== "No-show");
  const nextAppt = activeAppts.length > 0 ? activeAppts[0] : null;
  const queueAppts = activeAppts.length > 1 ? activeAppts.slice(1) : [];
  const finishedAppts = sorted.filter(a => a.Status === "Completed" || a.Status === "Cancelled" || a.Status === "No-show");

  return (
    <div className="clinic-pattern min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-6">
        
        {/* Doctor Banner */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider">{todayLabel}</p>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-white md:text-4xl">Doctor Console</h1>
            <p className="mt-1 text-sm text-slate-400">
              EHR patient consultation portal — {upcoming} pending / {total} total appointments today.
            </p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/5 bg-slate-900/40 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-slate-800/45 disabled:opacity-50"
          >
            <svg 
              className={`h-4.5 w-4.5 ${loading ? "animate-spin" : ""}`} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh Queue
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-shimmer rounded-xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md py-16 text-center text-xs text-slate-400 shadow-md">
            No patient appointments scheduled on today's calendar list.
          </div>
        ) : (
          
          /* EHR Grid Columns */
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            
            {/* Column 1: Active Consultation (col-span-8) */}
            <div className="lg:col-span-8 space-y-6">
              
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                Active Consultation
              </h3>

              {nextAppt ? (
                <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/40 backdrop-blur-md p-6 shadow-xl shadow-black/10 space-y-5">
                  
                  {/* Header info */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-white/5 pb-4 gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-serif text-2xl font-bold text-white">{nextAppt["Appointment Time"]}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColors[nextAppt.Status]?.bg} ${statusColors[nextAppt.Status]?.text}`}>
                          <span className={`h-1 w-1 rounded-full ${statusColors[nextAppt.Status]?.dot}`} />
                          {nextAppt.Status}
                        </span>
                        <span className="rounded-md bg-slate-950/40 border border-white/5 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                          {nextAppt["Appointment Type"]}
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white mt-1.5">{nextAppt["Patient Name"]}</h4>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">ID: {nextAppt["Booking ID"]}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[10px] font-semibold text-slate-300">
                      <span className="rounded-lg bg-slate-950/40 p-2 border border-white/5">Age: {nextAppt.Age || "0"} yrs</span>
                      <span className="rounded-lg bg-slate-950/40 p-2 border border-white/5">Gender: {nextAppt.Gender || "—"}</span>
                    </div>
                  </div>

                  {/* Body logs */}
                  <div className="grid gap-4 md:grid-cols-2 text-xs leading-relaxed text-slate-300">
                    <div className="space-y-1 bg-slate-950/40 border border-white/5 p-4 rounded-xl">
                      <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider mb-1">Reason for Visit</span>
                      <p className="text-white">{nextAppt["Reason for Visit"] || "No reason specified"}</p>
                    </div>
                    <div className="space-y-1 bg-slate-950/40 border border-white/5 p-4 rounded-xl">
                      <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider mb-1">Patient Intake Notes</span>
                      <p className="text-slate-400">{nextAppt.Notes || "No intake notes provided"}</p>
                    </div>
                  </div>

                  {/* EHR Action Toolbar */}
                  <div className="flex justify-between items-center border-t border-white/5 pt-4 mt-2">
                    <div className="flex gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {nextAppt.Phone || "—"}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      {selectedAppt?.id === nextAppt.id ? (
                        <button
                          onClick={() => {
                            setSelectedAppt(null);
                            setDoctorNotes("");
                          }}
                          className="rounded-xl border border-white/5 bg-slate-950 px-4 py-2.5 text-xs font-semibold text-slate-400 transition-colors hover:bg-slate-900"
                        >
                          Hide Editor
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedAppt(nextAppt);
                            setDoctorNotes(nextAppt["Admin Notes"] || "");
                          }}
                          className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-2.5 text-xs font-semibold text-cyan-400 transition-all hover:bg-cyan-500/10"
                        >
                          Diagnose / Add Notes
                        </button>
                      )}
                      <button
                        onClick={() => handleComplete(nextAppt.id)}
                        disabled={updatingId === nextAppt.id}
                        className="rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition-all hover:opacity-90 disabled:opacity-50"
                      >
                        {updatingId === nextAppt.id ? "Completing..." : "Complete Session"}
                      </button>
                    </div>
                  </div>

                  {/* Notes Editor Slide-in */}
                  {selectedAppt?.id === nextAppt.id && (
                    <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/40 p-5 space-y-3.5 animate-fade-in-up">
                      <div>
                        <label className="block text-[11px] font-bold text-white uppercase tracking-wider mb-1">
                          Prescriptions & Diagnosis Notes
                        </label>
                        <textarea
                          value={doctorNotes}
                          onChange={(e) => setDoctorNotes(e.target.value)}
                          placeholder="Provide clinic diagnosis, prescription names, dosages, and timeline instructions..."
                          rows={4}
                          className="w-full rounded-xl border border-white/5 bg-slate-900 px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-500"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setSelectedAppt(null);
                            setDoctorNotes("");
                          }}
                          className="rounded-lg border border-white/5 bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleComplete(nextAppt.id)}
                          disabled={updatingId === nextAppt.id}
                          className="rounded-lg bg-gradient-to-r from-cyan-500 to-teal-400 px-4.5 py-2 text-xs font-bold text-slate-950 hover:opacity-90 disabled:opacity-50"
                        >
                          Save & Checkout
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/5 bg-slate-900/40 backdrop-blur-md py-16 text-center text-xs text-slate-400">
                  No active consult scheduled. Select a patient from the queue.
                </div>
              )}

              {/* Today's upcoming queue */}
              {queueAppts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">Upcoming Queue Today</h4>
                  <div className="space-y-2">
                    {queueAppts.map((appt) => (
                      <div 
                        key={appt.id}
                        onClick={() => {
                          setSelectedAppt(appt);
                          setDoctorNotes(appt["Admin Notes"] || "");
                          // Make selected patient active by loading details
                          setAppointments(prev => {
                            const without = prev.filter(x => x.id !== appt.id);
                            return [appt, ...without];
                          });
                        }}
                        className="flex items-center justify-between border border-white/5 bg-slate-900/40 p-4 rounded-xl cursor-pointer hover:border-slate-700 transition-all hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-serif text-sm font-bold text-cyan-400 bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-2.5 py-1">
                            {appt["Appointment Time"]}
                          </span>
                          <div>
                            <h5 className="text-xs font-bold text-white">{appt["Patient Name"]}</h5>
                            <p className="text-[10px] text-slate-400 truncate max-w-[250px]">{appt["Reason for Visit"]}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-semibold bg-slate-950/40 border border-white/5 px-2 py-0.5 rounded">
                            {appt["Appointment Type"]}
                          </span>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusColors[appt.Status]?.dot || "bg-slate-400"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Column 2: Today's Logs Sidebar (col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
                Completed Sessions Today
              </h3>

              <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-4 shadow-lg space-y-3">
                {finishedAppts.length === 0 ? (
                  <p className="text-center text-[10px] text-slate-500 py-6">No completed consultations logged yet today.</p>
                ) : (
                  <div className="space-y-2.5">
                    {finishedAppts.map((appt) => {
                      const isComp = appt.Status === "Completed";
                      const isCan = appt.Status === "Cancelled";
                      return (
                        <div 
                          key={appt.id}
                          className="border border-white/5 bg-slate-950/30 rounded-xl p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <div>
                              <h5 className="text-xs font-bold text-white">{appt["Patient Name"]}</h5>
                              <span className="text-[9px] text-slate-450">{appt["Appointment Time"]} | {appt["Appointment Type"]}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase ${statusColors[appt.Status]?.bg} ${statusColors[appt.Status]?.text}`}>
                              {appt.Status}
                            </span>
                          </div>

                          {isComp && appt["Admin Notes"] && (
                            <div className="text-[10px] leading-relaxed text-slate-400">
                              <span className="font-bold text-white font-sans">Rx Notes: </span>
                              {appt["Admin Notes"]}
                            </div>
                          )}
                          {isCan && (
                            <div className="text-[10px] leading-relaxed text-rose-400">
                              <span className="font-bold">Cancellation details: </span>
                              Due to patient request.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>

        )}

      </div>
    </div>
  );
}
