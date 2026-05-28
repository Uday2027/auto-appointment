async function apiPost(path: string, data: object) {
  console.log(`[apiPost] POST ${path}`, data);
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const json = await res.json().catch(() => ({
    success: false,
    message: `Server error (${res.status})`,
  }));

  console.log(`[apiPost] response from ${path}:`, json);

  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }

  return json;
}

async function apiGet(path: string) {
  console.log(`[apiGet] GET ${path}`);
  const res = await fetch(path);
  const json = await res.json().catch(() => ({ success: false, message: `Server error (${res.status})` }));
  console.log(`[apiGet] response from ${path}:`, json);

  if (!res.ok) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json;
}

export async function submitBooking(data: object) {
  return apiPost("/api/book", data);
}

export async function submitReschedule(data: object) {
  return apiPost("/api/reschedule", data);
}

export async function fetchAppointments() {
  return apiGet("/api/admin/appointments");
}

export async function fetchTodayAppointments() {
  return apiGet("/api/admin/appointments/today");
}

export async function fetchStats() {
  return apiGet("/api/admin/stats");
}

export async function updateStatus(recordId: string, status: string, notes?: string) {
  return apiPost("/api/admin/status", { recordId, status, notes });
}

export async function submitCancellation(data: object) {
  return apiPost("/api/cancel", data);
}

export async function fetchAvailableDoctors(problem: string) {
  return apiPost("/api/available-doctors", { Problem: problem });
}

export async function fetchAvailability(doctors: Array<{ id: string; Specialization: string; Doctor: string }>) {
  return apiPost("/api/availability", { doctors });
}

export async function fetchBookedSlots(params: { "Day of Week": string; "Start Time"?: string; "End Time"?: string; Date: string }) {
  return apiPost("/api/booked-slots", params);
}


