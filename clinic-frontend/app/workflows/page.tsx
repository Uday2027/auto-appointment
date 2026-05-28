"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { toast } from "sonner";

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters?: any;
}

interface WorkflowConnections {
  [nodeName: string]: any;
}

interface Workflow {
  name: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnections;
  settings?: any;
  tags?: string[];
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(1); // Default to "01 - New Booking"
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"canvas" | "details" | "json">("canvas");
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});
  const [windowWidth, setWindowWidth] = useState(0);

  // Fallback static workflows for robust execution
  const fallbackWorkflows: Workflow[] = useMemo(() => [
    {
      name: "00 — Error Handler",
      nodes: [
        { id: "error-trigger", name: "Error Trigger", type: "n8n-nodes-base.errorTrigger", position: [240, 300] },
        { id: "format-error", name: "Code — Format Error", type: "n8n-nodes-base.code", position: [480, 300], parameters: { jsCode: "// Format error..." } },
        { id: "gmail-error-alert", name: "Gmail — Error Alert to Admin", type: "n8n-nodes-base.gmail", position: [720, 300], parameters: { sendTo: "YOUR_ADMIN_EMAIL" } }
      ],
      connections: {
        "Error Trigger": { main: [[{ node: "Code — Format Error", type: "main", index: 0 }]] },
        "Code — Format Error": { main: [[{ node: "Gmail — Error Alert to Admin", type: "main", index: 0 }]] }
      }
    },
    {
      name: "01 — New Booking",
      nodes: [
        { id: "webhook-new-booking", name: "Webhook — New Booking", type: "n8n-nodes-base.webhook", position: [200, 300] },
        { id: "respond-immediately", name: "Respond to Form", type: "n8n-nodes-base.respondToWebhook", position: [440, 160] },
        { id: "validate-and-prepare", name: "Validate & Prepare Data", type: "n8n-nodes-base.code", position: [440, 300] },
        { id: "airtable-create", name: "Airtable — Create Record", type: "n8n-nodes-base.airtable", position: [680, 300] },
        { id: "google-calendar-create", name: "Google Calendar — Create Event", type: "n8n-nodes-base.googleCalendar", position: [920, 300] },
        { id: "airtable-save-id", name: "Airtable — Save Calendar Event ID", type: "n8n-nodes-base.airtable", position: [1160, 300] },
        { id: "gmail-confirmation", name: "Gmail — Confirmation to Patient", type: "n8n-nodes-base.gmail", position: [1400, 180] },
        { id: "gmail-staff-notify", name: "Gmail — Notify Staff", type: "n8n-nodes-base.gmail", position: [1400, 420] },
        { id: "airtable-mark-confirmed", name: "Airtable — Mark Confirmation Sent", type: "n8n-nodes-base.airtable", position: [1640, 300] }
      ],
      connections: {
        "Webhook — New Booking": { main: [[{ node: "Respond to Form", type: "main", index: 0 }, { node: "Validate & Prepare Data", type: "main", index: 0 }]] },
        "Validate & Prepare Data": { main: [[{ node: "Airtable — Create Record", type: "main", index: 0 }]] },
        "Airtable — Create Record": { main: [[{ node: "Google Calendar — Create Event", type: "main", index: 0 }]] },
        "Google Calendar — Create Event": { main: [[{ node: "Airtable — Save Calendar Event ID", type: "main", index: 0 }]] },
        "Airtable — Save Calendar Event ID": { main: [[{ node: "Gmail — Confirmation to Patient", type: "main", index: 0 }, { node: "Gmail — Notify Staff", type: "main", index: 0 }]] },
        "Gmail — Confirmation to Patient": { main: [[{ node: "Airtable — Mark Confirmation Sent", type: "main", index: 0 }]] }
      }
    },
    {
      name: "02 — Reminders",
      nodes: [
        { id: "cron-trigger", name: "Schedule Trigger (Every 30m)", type: "n8n-nodes-base.scheduleTrigger", position: [200, 300] },
        { id: "fetch-due-reminders", name: "Airtable — Fetch Upcoming Appointments", type: "n8n-nodes-base.airtable", position: [440, 300] },
        { id: "split-reminders", name: "Loop Over Reminders", type: "n8n-nodes-base.splitInBatches", position: [680, 300] },
        { id: "determine-reminder-type", name: "Check 24h vs 2h Due", type: "n8n-nodes-base.switch", position: [920, 300] },
        { id: "gmail-24h-reminder", name: "Gmail — 24h Reminder Email", type: "n8n-nodes-base.gmail", position: [1160, 180] },
        { id: "gmail-2h-reminder", name: "Gmail — 2h Reminder Email", type: "n8n-nodes-base.gmail", position: [1160, 420] },
        { id: "airtable-update-24h-sent", name: "Airtable — Mark 24h Sent", type: "n8n-nodes-base.airtable", position: [1400, 180] },
        { id: "airtable-update-2h-sent", name: "Airtable — Mark 2h Sent", type: "n8n-nodes-base.airtable", position: [1400, 420] }
      ],
      connections: {
        "Schedule Trigger (Every 30m)": { main: [[{ node: "Airtable — Fetch Upcoming Appointments", type: "main", index: 0 }]] },
        "Airtable — Fetch Upcoming Appointments": { main: [[{ node: "Loop Over Reminders", type: "main", index: 0 }]] },
        "Loop Over Reminders": { main: [[{ node: "Check 24h vs 2h Due", type: "main", index: 0 }]] },
        "Check 24h vs 2h Due": { main: [[{ node: "Gmail — 24h Reminder Email", type: "main", index: 0 }, { node: "Gmail — 2h Reminder Email", type: "main", index: 0 }]] },
        "Gmail — 24h Reminder Email": { main: [[{ node: "Airtable — Mark 24h Sent", type: "main", index: 0 }]] },
        "Gmail — 2h Reminder Email": { main: [[{ node: "Airtable — Mark 2h Sent", type: "main", index: 0 }]] }
      }
    },
    {
      name: "03 — Cancellation",
      nodes: [
        { id: "webhook-cancel", name: "Webhook — Cancellation", type: "n8n-nodes-base.webhook", position: [200, 300] },
        { id: "fetch-cancellation-appt", name: "Airtable — Find Booking", type: "n8n-nodes-base.airtable", position: [440, 300] },
        { id: "verify-cancellation", name: "Validate Email & Booking", type: "n8n-nodes-base.if", position: [680, 300] },
        { id: "airtable-mark-cancelled", name: "Airtable — Status to Cancelled", type: "n8n-nodes-base.airtable", position: [920, 180] },
        { id: "calendar-delete-event", name: "Google Calendar — Delete Event", type: "n8n-nodes-base.googleCalendar", position: [1160, 180] },
        { id: "gmail-cancel-patient", name: "Gmail — Cancel Confirmation to Patient", type: "n8n-nodes-base.gmail", position: [1400, 180] },
        { id: "gmail-cancel-staff", name: "Gmail — Cancel Notification to Staff", type: "n8n-nodes-base.gmail", position: [1400, 320] },
        { id: "cancel-html-response", name: "Respond with Success HTML", type: "n8n-nodes-base.respondToWebhook", position: [1640, 180] },
        { id: "cancel-error-html", name: "Respond with Error HTML", type: "n8n-nodes-base.respondToWebhook", position: [920, 420] }
      ],
      connections: {
        "Webhook — Cancellation": { main: [[{ node: "Airtable — Find Booking", type: "main", index: 0 }]] },
        "Airtable — Find Booking": { main: [[{ node: "Validate Email & Booking", type: "main", index: 0 }]] },
        "Validate Email & Booking": { main: [[{ node: "Airtable — Status to Cancelled", type: "main", index: 0 }], [{ node: "Respond with Error HTML", type: "main", index: 0 }]] },
        "Airtable — Status to Cancelled": { main: [[{ node: "Google Calendar — Delete Event", type: "main", index: 0 }]] },
        "Google Calendar — Delete Event": { main: [[{ node: "Gmail — Cancel Confirmation to Patient", type: "main", index: 0 }, { node: "Gmail — Cancel Notification to Staff", type: "main", index: 0 }]] },
        "Gmail — Cancel Confirmation to Patient": { main: [[{ node: "Respond with Success HTML", type: "main", index: 0 }]] }
      }
    },
    {
      name: "04 — Reschedule",
      nodes: [
        { id: "webhook-reschedule", name: "Webhook — Reschedule", type: "n8n-nodes-base.webhook", position: [200, 300] },
        { id: "fetch-reschedule-appt", name: "Airtable — Find Booking", type: "n8n-nodes-base.airtable", position: [440, 300] },
        { id: "validate-reschedule", name: "Check Credentials & Deadline", type: "n8n-nodes-base.if", position: [680, 300] },
        { id: "calendar-update-event", name: "Google Calendar — Update Event", type: "n8n-nodes-base.googleCalendar", position: [920, 180] },
        { id: "airtable-save-reschedule", name: "Airtable — Reschedule Appointment", type: "n8n-nodes-base.airtable", position: [1160, 180] },
        { id: "gmail-reschedule-patient", name: "Gmail — Resched Confirmation to Patient", type: "n8n-nodes-base.gmail", position: [1400, 180] },
        { id: "gmail-reschedule-staff", name: "Gmail — Resched Notification to Staff", type: "n8n-nodes-base.gmail", position: [1400, 320] },
        { id: "resched-success-response", name: "Respond to Frontend (Success)", type: "n8n-nodes-base.respondToWebhook", position: [1640, 180] },
        { id: "resched-error-response", name: "Respond to Frontend (Error)", type: "n8n-nodes-base.respondToWebhook", position: [920, 420] }
      ],
      connections: {
        "Webhook — Reschedule": { main: [[{ node: "Airtable — Find Booking", type: "main", index: 0 }]] },
        "Airtable — Find Booking": { main: [[{ node: "Check Credentials & Deadline", type: "main", index: 0 }]] },
        "Check Credentials & Deadline": { main: [[{ node: "Google Calendar — Update Event", type: "main", index: 0 }], [{ node: "Respond to Frontend (Error)", type: "main", index: 0 }]] },
        "Google Calendar — Update Event": { main: [[{ node: "Airtable — Reschedule Appointment", type: "main", index: 0 }]] },
        "Airtable — Reschedule Appointment": { main: [[{ node: "Gmail — Resched Confirmation to Patient", type: "main", index: 0 }, { node: "Gmail — Resched Notification to Staff", type: "main", index: 0 }]] },
        "Gmail — Resched Confirmation to Patient": { main: [[{ node: "Respond to Frontend (Success)", type: "main", index: 0 }]] }
      }
    },
    {
      name: "05 — Daily Summary",
      nodes: [
        { id: "daily-cron", name: "Schedule Trigger (8 AM)", type: "n8n-nodes-base.scheduleTrigger", position: [200, 300] },
        { id: "fetch-today-appts", name: "Airtable — Fetch Today's Appointments", type: "n8n-nodes-base.airtable", position: [440, 300] },
        { id: "format-summary-html", name: "Code — Format HTML Table", type: "n8n-nodes-base.code", position: [680, 300] },
        { id: "gmail-staff-summary", name: "Gmail — Daily Agenda to Staff", type: "n8n-nodes-base.gmail", position: [920, 300] }
      ],
      connections: {
        "Schedule Trigger (8 AM)": { main: [[{ node: "Airtable — Fetch Today's Appointments", type: "main", index: 0 }]] },
        "Airtable — Fetch Today's Appointments": { main: [[{ node: "Code — Format HTML Table", type: "main", index: 0 }]] },
        "Code — Format HTML Table": { main: [[{ node: "Gmail — Daily Agenda to Staff", type: "main", index: 0 }]] }
      }
    },
    {
      name: "06 — Admin & Doctor Panel API",
      nodes: [
        { id: "webhook-admin-api", name: "Webhook — Router & Authenticator", type: "n8n-nodes-base.webhook", position: [200, 300] },
        { id: "determine-endpoint", name: "Switch on Route Action", type: "n8n-nodes-base.switch", position: [440, 300] },
        { id: "fetch-all-appts", name: "Airtable — Fetch All Records", type: "n8n-nodes-base.airtable", position: [680, 100] },
        { id: "fetch-today-list", name: "Airtable — Fetch Today List", type: "n8n-nodes-base.airtable", position: [680, 240] },
        { id: "fetch-summary-stats", name: "Airtable — Fetch Summary Stats", type: "n8n-nodes-base.airtable", position: [680, 380] },
        { id: "airtable-update-appt-status", name: "Airtable — Update Status & Notes", type: "n8n-nodes-base.airtable", position: [680, 520] },
        { id: "respond-all-appts", name: "Respond All Appointments", type: "n8n-nodes-base.respondToWebhook", position: [920, 100] },
        { id: "respond-today-list", name: "Respond Today List", type: "n8n-nodes-base.respondToWebhook", position: [920, 240] },
        { id: "compute-stats", name: "Code — Calculate KPI Stats", type: "n8n-nodes-base.code", position: [920, 380] },
        { id: "respond-updated-status", name: "Respond Updated Status", type: "n8n-nodes-base.respondToWebhook", position: [920, 520] },
        { id: "respond-calculated-stats", name: "Respond Stats", type: "n8n-nodes-base.respondToWebhook", position: [1160, 380] }
      ],
      connections: {
        "Webhook — Router & Authenticator": { main: [[{ node: "Switch on Route Action", type: "main", index: 0 }]] },
        "Switch on Route Action": { main: [[{ node: "Airtable — Fetch All Records", type: "main", index: 0 }], [{ node: "Airtable — Fetch Today List", type: "main", index: 0 }], [{ node: "Airtable — Fetch Summary Stats", type: "main", index: 0 }], [{ node: "Airtable — Update Status & Notes", type: "main", index: 0 }]] },
        "Airtable — Fetch All Records": { main: [[{ node: "Respond All Appointments", type: "main", index: 0 }]] },
        "Airtable — Fetch Today List": { main: [[{ node: "Respond Today List", type: "main", index: 0 }]] },
        "Airtable — Fetch Summary Stats": { main: [[{ node: "Code — Calculate KPI Stats", type: "main", index: 0 }]] },
        "Airtable — Update Status & Notes": { main: [[{ node: "Respond Updated Status", type: "main", index: 0 }]] },
        "Code — Calculate KPI Stats": { main: [[{ node: "Respond Stats", type: "main", index: 0 }]] }
      }
    }
  ], []);

  // Fetch workflows from the Next.js API
  useEffect(() => {
    async function getWorkflows() {
      try {
        const res = await fetch("/api/workflows");
        const json = await res.json();
        if (json.success && Array.isArray(json.workflows) && json.workflows.length > 0) {
          setWorkflows(json.workflows);
        } else {
          setWorkflows(fallbackWorkflows);
        }
      } catch (e) {
        console.warn("Could not read dynamic workflows, using static fallback:", e);
        setWorkflows(fallbackWorkflows);
      } finally {
        setLoading(false);
      }
    }
    getWorkflows();
  }, [fallbackWorkflows]);

  // Keep track of window width to re-calculate connection coordinates on resize
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowWidth(window.innerWidth);
      const handleResize = () => setWindowWidth(window.innerWidth);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const selectedWorkflow = workflows[selectedIndex];

  // Map nodes to canvas layout percentages
  const scaledNodes = useMemo(() => {
    if (!selectedWorkflow || !selectedWorkflow.nodes) return [];
    const xs = selectedWorkflow.nodes.map((n) => n.position?.[0] || 0);
    const ys = selectedWorkflow.nodes.map((n) => n.position?.[1] || 0);
    
    const minX = Math.min(...xs) - 80;
    const maxX = Math.max(...xs) + 120;
    const minY = Math.min(...ys) - 100;
    const maxY = Math.max(...ys) + 100;

    const widthRange = Math.max(maxX - minX, 200);
    const heightRange = Math.max(maxY - minY, 200);

    return selectedWorkflow.nodes.map((node) => ({
      ...node,
      left: `${((node.position?.[0] - minX) / widthRange) * 100}%`,
      top: `${((node.position?.[1] - minY) / heightRange) * 100}%`,
    }));
  }, [selectedWorkflow]);

  // Recalculate coordinates for connections based on actual DOM bounds
  useEffect(() => {
    if (!selectedWorkflow || loading) return;
    
    // Tiny delay to let DOM render
    const timer = setTimeout(() => {
      if (!canvasRef.current) return;
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const positions: Record<string, { x: number; y: number; w: number; h: number }> = {};

      selectedWorkflow.nodes.forEach((node) => {
        const el = canvasRef.current?.querySelector(`[data-node-name="${node.name}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          positions[node.name] = {
            x: rect.left - canvasRect.left,
            y: rect.top - canvasRect.top,
            w: rect.width,
            h: rect.height,
          };
        }
      });
      setNodePositions(positions);
    }, 150);

    return () => clearTimeout(timer);
  }, [selectedWorkflow, selectedIndex, windowWidth, loading, activeTab]);

  // Render node icon helper
  const getNodeColorAndIcon = (type: string) => {
    const isWebhook = type.includes("webhook");
    const isAirtable = type.includes("airtable");
    const isGoogle = type.includes("googleCalendar");
    const isGmail = type.includes("gmail");
    const isCode = type.includes("code");
    const isCron = type.includes("scheduleTrigger");
    const isError = type.includes("errorTrigger");
    const isResponse = type.includes("respondToWebhook");

    if (isWebhook || isResponse) {
      return {
        bg: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-cyan-950/20",
        pill: "bg-cyan-500",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        ),
      };
    }
    if (isAirtable) {
      return {
        bg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-indigo-950/20",
        pill: "bg-indigo-500",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
          </svg>
        ),
      };
    }
    if (isGoogle) {
      return {
        bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-950/20",
        pill: "bg-emerald-500",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
          </svg>
        ),
      };
    }
    if (isGmail) {
      return {
        bg: "bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-950/20",
        pill: "bg-rose-500",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        ),
      };
    }
    if (isCode) {
      return {
        bg: "bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-amber-950/20",
        pill: "bg-amber-500",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        ),
      };
    }
    if (isCron) {
      return {
        bg: "bg-violet-500/10 border-violet-500/20 text-violet-400 shadow-violet-950/20",
        pill: "bg-violet-500",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        ),
      };
    }
    if (isError) {
      return {
        bg: "bg-red-500/10 border-red-500/20 text-red-400 shadow-red-950/20",
        pill: "bg-red-500",
        icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        ),
      };
    }
    return {
      bg: "bg-slate-500/10 border-slate-500/20 text-slate-400 shadow-slate-950/20",
      pill: "bg-slate-500",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    };
  };

  // Compile setup variables checklist based on selected workflow
  const placeholdersChecklist = useMemo(() => {
    if (!selectedWorkflow) return [];
    const raw = JSON.stringify(selectedWorkflow);
    const list = [];
    if (raw.includes("YOUR_AIRTABLE_BASE_ID")) list.push({ name: "Airtable Base ID", desc: "Airtable base identifier starting with 'app'", var: "YOUR_AIRTABLE_BASE_ID" });
    if (raw.includes("YOUR_AIRTABLE_CREDENTIAL_ID")) list.push({ name: "n8n Airtable Credentials", desc: "Linked Airtable API Token in n8n settings", var: "YOUR_AIRTABLE_CREDENTIAL_ID" });
    if (raw.includes("YOUR_GOOGLE_CREDENTIAL_ID")) list.push({ name: "n8n Google OAuth2 Credentials", desc: "Google API credentials for Calendar and Gmail", var: "YOUR_GOOGLE_CREDENTIAL_ID" });
    if (raw.includes("YOUR_GOOGLE_CALENDAR_ID")) list.push({ name: "Google Calendar ID", desc: "Primary calendar ID from Google Settings", var: "YOUR_GOOGLE_CALENDAR_ID" });
    if (raw.includes("YOUR_STAFF_EMAIL")) list.push({ name: "Clinic Staff Email Address", desc: "Inbox for receiving receptionist summaries", var: "YOUR_STAFF_EMAIL" });
    if (raw.includes("YOUR_ADMIN_EMAIL")) list.push({ name: "Admin Alert Email Address", desc: "Destination for error alert emails", var: "YOUR_ADMIN_EMAIL" });
    if (raw.includes("YOUR_DOCTOR_NAME")) list.push({ name: "Doctor Name Placeholder", desc: "Personalized text inside emails, e.g. Dr. Karim", var: "YOUR_DOCTOR_NAME" });
    if (raw.includes("YOUR_CLINIC_NAME")) list.push({ name: "Clinic Name", desc: "Company name displayed in footers, e.g. MedCare Clinic", var: "YOUR_CLINIC_NAME" });
    if (raw.includes("YOUR_CLINIC_ADDRESS")) list.push({ name: "Clinic Address", desc: "Location info populated in calendar appointments", var: "YOUR_CLINIC_ADDRESS" });
    if (raw.includes("YOUR_CLINIC_PHONE")) list.push({ name: "Clinic Phone", desc: "Support line text for booking notifications", var: "YOUR_CLINIC_PHONE" });
    if (raw.includes("YOUR_N8N_BASE_URL")) list.push({ name: "n8n Base URL", desc: "Link back to your n8n cloud dashboard", var: "YOUR_N8N_BASE_URL" });
    if (raw.includes("YOUR_NEXT_JS_URL")) list.push({ name: "Next.js Web URL", desc: "Deployed URL of this clinic scheduling portal", var: "YOUR_NEXT_JS_URL" });
    if (raw.includes("YOUR_ERROR_WORKFLOW_ID")) list.push({ name: "n8n Error Handler ID", desc: "Execution ID of Workflow 00", var: "YOUR_ERROR_WORKFLOW_ID" });
    return list;
  }, [selectedWorkflow]);

  // Copy workflow JSON to clipboard
  const handleCopyJson = () => {
    if (!selectedWorkflow) return;
    navigator.clipboard.writeText(JSON.stringify(selectedWorkflow, null, 2));
    toast.success("Workflow JSON copied to clipboard! You can now import it directly into n8n.");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-20 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-400">Loading n8n automation engine workflows...</p>
      </div>
    );
  }

  return (
    <div className="clinic-pattern min-h-screen py-10">
      <div className="mx-auto max-w-7xl px-6">
        
        {/* Header */}
        <div className="mb-10 text-center md:text-left">
          <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-400">
            System Architecture
          </span>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-white md:text-4xl">
            n8n Automation Engine
          </h1>
          <p className="mt-2 max-w-2xl text-xs md:text-sm text-slate-400 leading-relaxed">
            This scheduling system is powered by an autonomous n8n backend. Browse the 7 workflows that orchestrate database entries, Google Calendar syncing, Gmail notifications, and cron reminders.
          </p>
        </div>

        {/* Workspace Layout */}
        <div className="grid gap-8 lg:grid-cols-4">
          
          {/* Left: Workflow Selector Sidebar */}
          <div className="space-y-3 lg:col-span-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Select Workflow
            </h3>
            <div className="flex flex-col gap-1.5">
              {workflows.map((wf, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedIndex(idx);
                    setSelectedNode(null);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-xs font-semibold transition-all duration-200 ${
                    selectedIndex === idx
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-md shadow-cyan-950/20"
                      : "border-white/5 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  <span className="truncate">{wf.name}</span>
                  {idx === 0 && (
                    <span className="rounded bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-400">
                      Alerts
                    </span>
                  )}
                  {idx === 6 && (
                    <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-400">
                      API
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Quick n8n connection instructions */}
            <div className="rounded-xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-4 text-[11px] text-slate-400 leading-relaxed shadow-lg">
              <p className="font-semibold text-white mb-1.5 flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                  <path d="M12 16v-4"/>
                  <path d="M12 8h.01"/>
                </svg>
                Importing to n8n
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>Copy the workflow JSON config.</li>
                <li>In your n8n workspace, create a blank sheet.</li>
                <li>Paste (<kbd className="rounded bg-slate-950 px-1 py-0.5 border border-white/10">Ctrl+V</kbd>) directly into the board.</li>
                <li>Authorize credentials & switch to **Active**.</li>
              </ol>
            </div>
          </div>

          {/* Right: Selected Workflow Visualizer & Settings */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Title Card */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-5 shadow-lg shadow-black/10">
              <div>
                <h2 className="font-serif text-xl font-bold text-white">
                  {selectedWorkflow?.name}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Nodes: {selectedWorkflow?.nodes?.length || 0} | Connections: {Object.keys(selectedWorkflow?.connections || {}).length}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition-all hover:opacity-90 hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy JSON
                </button>
              </div>
            </div>

            {/* Tab Controller */}
            <div className="flex border-b border-white/5 gap-4">
              {[
                { id: "canvas", label: "Visual Canvas" },
                { id: "details", label: "Setup Checklist" },
                { id: "json", label: "Raw JSON Node" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 text-xs font-semibold transition-all border-b-2 ${
                    activeTab === tab.id
                      ? "border-cyan-500 text-cyan-400"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Canvas Tab Content */}
            {activeTab === "canvas" && (
              <div className="space-y-6">
                
                {/* Visual Board Container */}
                <div 
                  ref={canvasRef}
                  className="relative h-[380px] w-full rounded-2xl border border-white/5 bg-[#0b0f19] shadow-inner overflow-hidden select-none"
                  style={{
                    backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.02) 1.5px, transparent 1.5px)",
                    backgroundSize: "20px 20px"
                  }}
                >
                  {/* Drawing SVG Bezier Curves for Connections */}
                  <svg className="absolute inset-0 h-full w-full pointer-events-none z-0">
                    <defs>
                      <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="6"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 1 L 10 5 L 0 9 z" fill="#06b6d4" />
                      </marker>
                    </defs>
                    
                    {selectedWorkflow && selectedWorkflow.connections && 
                      Object.entries(selectedWorkflow.connections).map(([sourceName, connDetails]) => {
                        const sourcePos = nodePositions[sourceName];
                        if (!sourcePos) return null;

                        return connDetails.main?.[0]?.map((target: any, idx: number) => {
                          const targetPos = nodePositions[target.node];
                          if (!targetPos) return null;

                          // Source coordinate: Middle right edge
                          const x1 = sourcePos.x + sourcePos.w;
                          const y1 = sourcePos.y + sourcePos.h / 2;

                          // Target coordinate: Middle left edge
                          const x2 = targetPos.x;
                          const y2 = targetPos.y + targetPos.h / 2;

                          // Dynamic Bezier Control Points
                          const dx = Math.abs(x2 - x1) * 0.45;
                          const pathData = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

                          return (
                            <g key={`${sourceName}-${target.node}-${idx}`}>
                              {/* Glowing path highlight under */}
                              <path
                                d={pathData}
                                fill="none"
                                stroke="#06b6d4"
                                strokeWidth="4"
                                className="opacity-15 pointer-events-none"
                              />
                              {/* Actual Connection Line with flow animations */}
                              <path
                                d={pathData}
                                fill="none"
                                stroke="#06b6d4"
                                strokeWidth="1.5"
                                markerEnd="url(#arrow)"
                                className="animate-connection-flow opacity-60 transition-colors hover:stroke-[#06b6d4] pointer-events-auto cursor-pointer"
                              />
                            </g>
                          );
                        });
                      })}
                  </svg>

                  {/* Render Scaled Nodes */}
                  {scaledNodes.map((node) => {
                    const styling = getNodeColorAndIcon(node.type);
                    const isSelected = selectedNode?.name === node.name;

                    return (
                      <div
                        key={node.id}
                        data-node-name={node.name}
                        onClick={() => setSelectedNode(node)}
                        className={`absolute z-10 flex h-14 w-44 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-2.5 rounded-xl border bg-slate-900 p-2.5 shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
                          isSelected
                            ? "border-cyan-500 ring-4 ring-cyan-500/10 scale-105 shadow-md shadow-cyan-950/20"
                            : "border-white/5 hover:border-slate-600"
                        }`}
                        style={{
                          left: node.left,
                          top: node.top,
                        }}
                      >
                        {/* Left edge colored pill */}
                        <div className={`h-full w-1 rounded-full ${styling.pill} absolute left-1 top-0 bottom-0 my-auto`} style={{ height: 'calc(100% - 10px)' }} />

                        {/* Node Icon */}
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${styling.bg}`}>
                          {styling.icon}
                        </div>

                        {/* Node Label text */}
                        <div className="overflow-hidden pr-1">
                          <p className="truncate text-[10px] font-bold text-white">
                            {node.name}
                          </p>
                          <p className="truncate text-[8px] uppercase tracking-wider text-slate-400">
                            {node.type.replace("n8n-nodes-base.", "")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Node Details Card (appears when clicking a node) */}
                <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-5 shadow-lg shadow-black/10 transition-all">
                  {selectedNode ? (
                    <div>
                      <div className="flex items-center gap-3 border-b border-white/5 pb-3 mb-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${getNodeColorAndIcon(selectedNode.type).bg}`}>
                          {getNodeColorAndIcon(selectedNode.type).icon}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{selectedNode.name}</h4>
                          <span className="text-[10px] font-mono text-cyan-400">{selectedNode.type}</span>
                        </div>
                      </div>
                      <div className="space-y-3 text-xs text-white">
                        <div>
                          <span className="font-semibold text-slate-400 block mb-1">Purpose</span>
                          <p className="leading-relaxed text-slate-300">
                            {selectedNode.type.includes("webhook") && "Listens for incoming HTTP POST/GET requests. Connects Next.js to trigger automation."}
                            {selectedNode.type.includes("airtable") && "Performs database operations on Airtable base fields (create, lookup, or update records)."}
                            {selectedNode.type.includes("googleCalendar") && "Syncs meetings and schedules directly with Google Calendar events."}
                            {selectedNode.type.includes("gmail") && "Dispatches formatted transactional notification templates via Google OAuth2."}
                            {selectedNode.type.includes("code") && "Executes secure JavaScript block arrays to structure schemas, generate IDs, or calculate time."}
                            {selectedNode.type.includes("scheduleTrigger") && "Triggers automation on interval cron triggers (every 30 minutes, daily, etc.)"}
                            {selectedNode.type.includes("errorTrigger") && "Catches execution logs of failed nodes in other workflows and routes alerts."}
                            {selectedNode.type.includes("respondToWebhook") && "Sends immediate HTTP response structures back to the client browser flow."}
                            {!["webhook", "airtable", "googleCalendar", "gmail", "code", "scheduleTrigger", "errorTrigger", "respondToWebhook"].some(k => selectedNode.type.includes(k)) && "Performs routing logic or utility workflows within n8n."}
                          </p>
                        </div>
                        {selectedNode.parameters && (
                          <div>
                            <span className="font-semibold text-slate-400 block mb-1">Configuration Parameters</span>
                            <pre className="rounded-lg bg-slate-950/40 p-3 text-[10px] font-mono text-white border border-white/5 max-h-48 overflow-auto">
                              {JSON.stringify(selectedNode.parameters, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400 leading-relaxed">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2 text-slate-500">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <path d="M9 17V7l7 5z"/>
                      </svg>
                      Click on any node in the canvas visualizer above to inspect its properties and purpose.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Checklist Tab Content */}
            {activeTab === "details" && (
              <div className="rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-6 shadow-lg shadow-black/10 space-y-6">
                <div>
                  <h3 className="font-serif text-lg font-bold text-white mb-1">Configuration Checklist</h3>
                  <p className="text-xs text-slate-400">To host these workflows, you must search and replace these variables inside the workflow file or your n8n environment.</p>
                </div>

                {placeholdersChecklist.length === 0 ? (
                  <div className="py-4 text-center text-xs text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    No template placeholders required for this workflow. Ready to activate!
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {placeholdersChecklist.map((item, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between border border-white/5 rounded-xl p-3.5 bg-slate-950/40 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-white">{item.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                        </div>
                        <span className="font-mono text-[10px] px-2 py-1 bg-slate-900 border border-white/10 text-cyan-400 rounded self-start sm:self-center">
                          {item.var}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* JSON Code Tab Content */}
            {activeTab === "json" && (
              <div className="relative">
                <button
                  onClick={handleCopyJson}
                  className="absolute right-3 top-3 rounded-lg bg-slate-900 border border-white/5 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-slate-800 transition-all shadow-sm"
                >
                  Copy Raw JSON
                </button>
                <pre className="max-h-[500px] overflow-auto rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md p-5 font-mono text-[10px] leading-relaxed text-cyan-300 shadow-lg">
                  {JSON.stringify(selectedWorkflow, null, 2)}
                </pre>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
