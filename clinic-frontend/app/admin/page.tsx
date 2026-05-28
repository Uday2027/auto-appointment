"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { toast } from "sonner";
import { fetchAppointments, fetchTodayAppointments, fetchStats, updateStatus } from "@/lib/api";

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
  "Cancellation Reason"?: string;
  "Cancelled At"?: string;
  "Reschedule Reason"?: string;
  "Rescheduled At"?: string;
}

interface Stats {
  total: number;
  booked: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  rescheduled: number;
  byType: {
    newConsultation: number;
    followUp: number;
    reportReview: number;
    emergency: number;
  };
}

const statusColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  Booked: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", dot: "bg-blue-400" },
  Confirmed: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", dot: "bg-emerald-400" },
  Completed: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", dot: "bg-slate-400" },
  Cancelled: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", dot: "bg-rose-400" },
  "No-show": { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20", dot: "bg-red-400" },
  Rescheduled: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", dot: "bg-amber-400" },
};

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 h-full">
        <svg width="120" height="120" viewBox="0 0 40 40" className="-rotate-90">
          <circle cx="20" cy="20" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        </svg>
        <p className="mt-2 text-xs text-slate-500">No data available</p>
      </div>
    );
  }

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 py-2 justify-center h-full">
      <div className="relative flex-shrink-0">
        <svg width="130" height="130" viewBox="0 0 40 40" className="-rotate-90 drop-shadow-sm">
          {slices.map((slice, i) => {
            if (slice.value === 0) return null;
            const percent = slice.value / total;
            const strokeDasharray = `${percent * 100} ${100 - percent * 100}`;
            const strokeDashoffset = 100 - accumulatedPercent + 25; // +25 starts at 12 o'clock
            accumulatedPercent += percent * 100;
            return (
              <circle
                key={i}
                cx="20"
                cy="20"
                r="15.915"
                fill="transparent"
                stroke={slice.color}
                strokeWidth="5"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300 ease-in-out hover:stroke-[6]"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-white">{total}</span>
          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Bookings</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 text-xs w-full max-w-[150px]">
        {slices.map((s, i) => {
          if (s.value === 0) return null;
          const pct = ((s.value / total) * 100).toFixed(0);
          return (
            <div key={i} className="flex items-center gap-1.5 justify-between">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="font-semibold text-slate-300 truncate">{s.label}</span>
              </div>
              <span className="text-slate-400 font-bold flex-shrink-0">{s.value} <span className="font-normal text-[10px]">({pct}%)</span></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [authError, setAuthError] = useState("");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [inspectorTitle, setInspectorTitle] = useState("");
  const [inspectorData, setInspectorData] = useState<any>(null);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Dashboard view tab controller
  const [viewTab, setViewTab] = useState<"list" | "analytics" | "inspector">("list");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [apptsData, statsData] = await Promise.all([fetchAppointments(), fetchStats()]);
      setAppointments(apptsData.appointments || []);
      setStats(statsData);
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
          <h2 className="font-serif text-2xl font-bold text-white mb-2">Admin Security</h2>
          <p className="text-xs text-slate-400 mb-6">Enter the administrative passcode to access the reporting portal.</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (passcode === "admin123") {
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
                placeholder="Enter admin passcode"
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

  const handleStatusUpdate = async (recordId: string, status: string) => {
    setUpdatingId(recordId);
    try {
      const result = await updateStatus(recordId, status);
      setAppointments((prev) =>
        prev.map((a) => (a.id === recordId ? { ...a, Status: status } : a))
      );
      const statsData = await fetchStats();
      setStats(statsData);
      toast.success(`Status updated to ${result.status || status}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = appointments.filter((a) => {
    const matchStatus = filter === "All" || a.Status === filter;
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      (a["Patient Name"] || "").toLowerCase().includes(term) ||
      (a["Booking ID"] || "").toLowerCase().includes(term) ||
      (a.Email || "").toLowerCase().includes(term);
    return matchStatus && matchSearch;
  });

  // Get initials for patient avatar icon
  const getInitials = (name: string) => {
    if (!name) return "P";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  return (
    <div className="clinic-pattern min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-6">
        
        {/* Dashboard Title & Actions */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-white md:text-4xl">Admin Workspace</h1>
            <p className="mt-1 text-sm text-slate-400">Manage appointment lifecycle, track stats, and inspect webhook JSON endpoints.</p>
          </div>
          <div className="flex gap-2.5">
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
                strokeLinecap="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              {loading ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Tab Controls */}
        <div className="mb-6 flex border-b border-white/5 gap-6">
          {[
            { id: "list", label: "Appointments Manager" },
            { id: "analytics", label: "Analytics & Breakdown" },
            { id: "inspector", label: "n8n Webhook Inspector" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewTab(tab.id as any)}
              className={`pb-3 text-xs font-bold transition-all border-b-2 ${
                viewTab === tab.id
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab CONTENT 1: LIST MANAGER */}
        {viewTab === "list" && (
          <div className="space-y-6">
            
            {/* Filters & Search Row */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-slate-900/40 border border-white/5 p-4 rounded-2xl shadow-lg">
              <div className="flex flex-wrap gap-1.5">
                {["All", "Booked", "Confirmed", "Completed", "Cancelled", "No-show", "Rescheduled"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      filter === s
                        ? "bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-bold"
                        : "border border-white/5 bg-slate-950/30 text-slate-400 hover:border-slate-700 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, booking ID, email..."
                  className="w-full rounded-xl border border-white/5 bg-slate-950/40 pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:bg-slate-950/60 md:w-72"
                />
                <svg className="absolute left-3 top-3 h-4 w-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </div>
            </div>

            {/* List Table */}
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 animate-shimmer rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md py-16 text-center text-xs text-slate-400 shadow-md">
                No appointments found matching search criteria.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md shadow-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-slate-950/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-5 py-3.5">Patient Details</th>
                        <th className="px-5 py-3.5">Schedule</th>
                        <th className="px-5 py-3.5">Visit Type</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((a) => {
                        const isExpanded = expandedId === a.id;
                        const statusObj = statusColors[a.Status] || { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", dot: "bg-slate-400" };

                        return (
                          <Fragment key={a.id}>
                            <tr
                              onClick={() => setExpandedId(isExpanded ? null : a.id)}
                              className={`border-b border-white/5 hover:bg-slate-800/20 cursor-pointer transition-colors ${
                                isExpanded ? "bg-slate-850/30" : ""
                              }`}
                            >
                              {/* Patient */}
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-xs font-bold text-cyan-400 border border-cyan-500/20">
                                    {getInitials(a["Patient Name"])}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white text-sm">{a["Patient Name"] || "—"}</p>
                                    <p className="text-[10px] text-slate-400">{a.Email || "—"}</p>
                                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">{a["Booking ID"] || "—"}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Schedule */}
                              <td className="px-5 py-4 whitespace-nowrap">
                                <p className="font-semibold text-white">{a["Appointment Date"] || "—"}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{a["Appointment Time"] || "—"}</p>
                              </td>

                              {/* Visit Type */}
                              <td className="px-5 py-4">
                                <span className="inline-block rounded-lg bg-slate-950/40 border border-white/5 px-2.5 py-1 text-[10px] font-medium text-slate-300">
                                  {a["Appointment Type"] || "—"}
                                </span>
                              </td>

                              {/* Status badge */}
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${statusObj.bg} ${statusObj.text} ${statusObj.border}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${statusObj.dot}`} />
                                  {a.Status || "—"}
                                </span>
                              </td>

                              {/* Quick status actions */}
                              <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1 flex-wrap">
                                  {["Confirmed", "Completed", "Cancelled"].map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => handleStatusUpdate(a.id, s)}
                                      disabled={updatingId === a.id || a.Status === s}
                                      className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all ${
                                        a.Status === s
                                          ? "bg-slate-900/50 text-slate-500 border border-transparent cursor-default"
                                          : "border border-white/5 bg-slate-950/40 text-slate-300 hover:border-slate-600 hover:text-white"
                                      }`}
                                    >
                                      {updatingId === a.id ? "..." : s}
                                    </button>
                                  ))}
                                  
                                  {/* Expand/Collapse indicator */}
                                  <span className={`ml-2 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                      <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                  </span>
                                </div>
                              </td>
                            </tr>

                            {/* Detailed breakdown sub-row */}
                            {isExpanded && (
                              <tr className="bg-slate-950/20">
                                <td colSpan={5} className="px-8 py-5 border-b border-white/5">
                                  <div className="grid gap-6 md:grid-cols-3 text-xs leading-relaxed text-slate-300 animate-fade-in">
                                    
                                    {/* Column 1 */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Demographics</span>
                                      <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-1">
                                        <p><span className="font-semibold text-slate-400">Age:</span> {a.Age || "0"} years</p>
                                        <p><span className="font-semibold text-slate-400">Gender:</span> {a.Gender || "—"}</p>
                                        <p><span className="font-semibold text-slate-400">Phone:</span> {a.Phone || "—"}</p>
                                      </div>
                                    </div>

                                    {/* Column 2 */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Clinical Notes</span>
                                      <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-1">
                                        <p><span className="font-semibold text-slate-400">Reason:</span> {a["Reason for Visit"] || "—"}</p>
                                        <p><span className="font-semibold text-slate-400">Patient Notes:</span> {a.Notes || "—"}</p>
                                        <p><span className="font-semibold text-slate-400">Doctor Feedback:</span> {a["Admin Notes"] || "—"}</p>
                                      </div>
                                    </div>

                                    {/* Column 3 (Conditions status cancellation/reschedule details) */}
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">System Log</span>
                                      {a.Status === "Cancelled" && (
                                        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 space-y-1 text-rose-400">
                                          <p className="font-bold">Cancellation Triggered</p>
                                          <p><span className="font-semibold">Reason:</span> {a["Cancellation Reason"] || "—"}</p>
                                          <p><span className="font-semibold">Logged At:</span> {a["Cancelled At"] || "—"}</p>
                                        </div>
                                      )}
                                      {a.Status === "Rescheduled" && (
                                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1 text-amber-400">
                                          <p className="font-bold">Rescheduled Triggered</p>
                                          <p><span className="font-semibold">Reason:</span> {a["Reschedule Reason"] || "—"}</p>
                                          <p><span className="font-semibold">Logged At:</span> {a["Rescheduled At"] ? new Date(a["Rescheduled At"]).toLocaleString() : "—"}</p>
                                        </div>
                                      )}
                                      {a.Status !== "Cancelled" && a.Status !== "Rescheduled" && (
                                        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 text-slate-400">
                                          <p className="font-semibold text-white">Active Booking</p>
                                          <p className="mt-1 leading-relaxed">Calendar & database tables remain in sync. Use actions to complete or cancel.</p>
                                        </div>
                                      )}
                                    </div>

                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab CONTENT 2: ANALYTICS */}
        {viewTab === "analytics" && (
          <div className="space-y-6">
            {stats ? (
              <div className="grid gap-6 lg:grid-cols-7 items-stretch">
                
                {/* Stats list grid */}
                <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                  {[
                    { label: "Total Bookings", value: stats.total, color: "bg-white", border: "border-white/5" },
                    { label: "Booked (New)", value: stats.booked, color: "bg-blue-400", border: "border-white/5" },
                    { label: "Confirmed", value: stats.confirmed, color: "bg-emerald-400", border: "border-white/5" },
                    { label: "Completed", value: stats.completed, color: "bg-slate-400", border: "border-white/5" },
                    { label: "Cancelled", value: stats.cancelled, color: "bg-rose-400", border: "border-white/5" },
                    { label: "No-show", value: stats.noShow, color: "bg-red-400", border: "border-white/5" },
                    { label: "Rescheduled", value: stats.rescheduled, color: "bg-amber-400", border: "border-white/5" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-2xl border ${s.border} bg-slate-900/40 backdrop-blur-md p-5 text-center shadow-lg hover:shadow-xl transition-shadow`}>
                      <div className={`mx-auto mb-2.5 h-1.5 w-7 rounded-full ${s.color}`} />
                      <div className="text-3xl font-extrabold text-white">{s.value}</div>
                      <div className="text-xs font-semibold text-slate-400 mt-1.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Donut chart and appointments by type */}
                <div className="lg:col-span-3 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-lg flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider text-center border-b border-white/5 pb-3 mb-4">
                      Workflow Status Distribution
                    </h3>
                    <DonutChart
                      slices={[
                        { label: "Booked", value: stats.booked, color: "#3b82f6" },
                        { label: "Confirmed", value: stats.confirmed, color: "#10b981" },
                        { label: "Completed", value: stats.completed, color: "#94a3b8" },
                        { label: "Cancelled", value: stats.cancelled, color: "#f43f5e" },
                        { label: "No-show", value: stats.noShow, color: "#ef4444" },
                        { label: "Rescheduled", value: stats.rescheduled, color: "#f59e0b" },
                      ]}
                    />
                  </div>
                  
                  {/* Appointments by type metrics */}
                  <div className="border-t border-white/5 pt-4 mt-4 space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bookings By Service Type</h4>
                    {[
                      { name: "New Consultation", val: stats.byType?.newConsultation || 0, color: "bg-cyan-500" },
                      { name: "Follow-up", val: stats.byType?.followUp || 0, color: "bg-indigo-500" },
                      { name: "Report Review", val: stats.byType?.reportReview || 0, color: "bg-amber-500" },
                      { name: "Emergency / Urgent", val: stats.byType?.emergency || 0, color: "bg-red-500" }
                    ].map((typeItem, index) => {
                      const percentage = stats.total > 0 ? ((typeItem.val / stats.total) * 100).toFixed(0) : "0";
                      return (
                        <div key={index} className="space-y-1 text-[11px]">
                          <div className="flex justify-between font-semibold text-slate-300">
                            <span>{typeItem.name}</span>
                            <span>{typeItem.val} ({percentage}%)</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-950/40 rounded-full overflow-hidden">
                            <div className={`h-full ${typeItem.color} rounded-full`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 bg-slate-900/40 border border-white/5 rounded-2xl shadow-lg">
                No statistical analytics available. Submit a booking first.
              </div>
            )}
          </div>
        )}

        {/* Tab CONTENT 3: WEBHOOK INSPECTOR */}
        {viewTab === "inspector" && (
          <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-lg space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-white">n8n Webhook Console</h2>
              <p className="text-xs text-slate-400">Select a backend API route below to fetch records directly from n8n webhooks and inspect the returned JSON schema.</p>
            </div>
            
            <div className="flex flex-wrap gap-2.5 border-b border-white/5 pb-5">
              <button
                onClick={async () => {
                  setInspectorLoading(true);
                  setInspectorTitle("GET /api/admin/appointments (All Appointments)");
                  try {
                    const data = await fetchAppointments();
                    setInspectorData(data);
                  } catch (err) {
                    setInspectorData({ error: err instanceof Error ? err.message : "Failed to fetch" });
                  } finally {
                    setInspectorLoading(false);
                  }
                }}
                className="rounded-xl border border-white/5 hover:border-white bg-slate-950/40 px-4 py-2.5 text-xs font-bold text-white transition-all"
              >
                Inspect All Bookings
              </button>
              
              <button
                onClick={async () => {
                  setInspectorLoading(true);
                  setInspectorTitle("GET /api/admin/appointments/today (Today's List)");
                  try {
                    const data = await fetchTodayAppointments();
                    setInspectorData(data);
                  } catch (err) {
                    setInspectorData({ error: err instanceof Error ? err.message : "Failed to fetch" });
                  } finally {
                    setInspectorLoading(false);
                  }
                }}
                className="rounded-xl border border-cyan-500/20 hover:border-cyan-400 bg-cyan-500/5 px-4 py-2.5 text-xs font-bold text-cyan-400 transition-all"
              >
                Inspect Today's List
              </button>
              
              <button
                onClick={async () => {
                  setInspectorLoading(true);
                  setInspectorTitle("GET /api/admin/stats (Dashboard KPI Metrics)");
                  try {
                    const data = await fetchStats();
                    setInspectorData(data);
                  } catch (err) {
                    setInspectorData({ error: err instanceof Error ? err.message : "Failed to fetch" });
                  } finally {
                    setInspectorLoading(false);
                  }
                }}
                className="rounded-xl border border-amber-500/20 hover:border-amber-400 bg-amber-500/5 px-4 py-2.5 text-xs font-bold text-amber-400 transition-all"
              >
                Inspect KPI Stats
              </button>
            </div>

            {inspectorTitle ? (
              <div className="rounded-2xl border border-white/5 bg-slate-950/40 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="font-mono text-xs font-bold text-slate-400">{inspectorTitle}</span>
                  <button
                    onClick={() => {
                      setInspectorTitle("");
                      setInspectorData(null);
                    }}
                    className="text-xs font-bold text-rose-400 hover:underline"
                  >
                    Clear Terminal
                  </button>
                </div>
                
                {inspectorLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                    Querying webhook endpoint on n8n...
                  </div>
                ) : (
                  <pre className="max-h-[350px] overflow-auto rounded-xl bg-slate-950/60 p-4 font-mono text-[10px] leading-relaxed text-cyan-400 border border-white/5 shadow-inner">
                    {JSON.stringify(inspectorData, null, 2)}
                  </pre>
                )}
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-slate-500 border border-white/5 border-dashed rounded-2xl bg-slate-950/20">
                Select an endpoint query button above to stream live payload data from the webhook layers.
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
