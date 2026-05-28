# n8n Workflows — Doctor Clinic Appointment System
## Complete Setup Guide

---

## Files in This Folder

| File | Workflow | Purpose |
|---|---|---|
| `00_error_handler.json` | Error Handler | Catches all failures, emails admin |
| `01_new_booking.json` | New Booking | Patient books → Airtable → Calendar → Emails |
| `02_reminders.json` | Reminders | 24h and 2h reminder emails (runs every 30 min) |
| `03_cancellation.json` | Cancellation | Patient cancels via email link |
| `04_reschedule.json` | Reschedule | Patient reschedules via Next.js form |
| `05_daily_summary.json` | Daily Summary | 8 AM daily email to clinic staff |
| `06_admin_doctor_api.json` | Admin/Doctor API | REST API endpoints for your Next.js panels |

---

## Step 1 — Import Order in n8n

Import in this exact order (error handler must be first):

1. `00_error_handler.json` → **Save → note its Workflow ID**
2. `01_new_booking.json`
3. `02_reminders.json`
4. `03_cancellation.json`
5. `04_reschedule.json`
6. `05_daily_summary.json`
7. `06_admin_doctor_api.json`

**How to import:**
1. Open n8n
2. Click **Workflows** → **Import from File**
3. Select the JSON file
4. Click **Import**

---

## Step 2 — Replace All Placeholders

Search and replace every placeholder in all JSON files before importing.

| Placeholder | Replace With | Where to Find It |
|---|---|---|
| `YOUR_AIRTABLE_BASE_ID` | Your Airtable Base ID (starts with `app`) | Airtable URL bar |
| `YOUR_AIRTABLE_CREDENTIAL_ID` | n8n Credential ID for Airtable | n8n → Credentials → Airtable |
| `YOUR_GOOGLE_CREDENTIAL_ID` | n8n Credential ID for Google OAuth2 | n8n → Credentials → Google |
| `YOUR_GOOGLE_CALENDAR_ID` | Your Google Calendar ID | Google Calendar → Settings → Calendar ID |
| `YOUR_STAFF_EMAIL` | Clinic staff email address | e.g. clinic@gmail.com |
| `YOUR_ADMIN_EMAIL` | Your personal email for error alerts | e.g. you@gmail.com |
| `YOUR_DOCTOR_NAME` | Doctor's full name | e.g. Dr. Karim |
| `YOUR_CLINIC_NAME` | Clinic name | e.g. MedCare Clinic |
| `YOUR_CLINIC_ADDRESS` | Full clinic address | e.g. Road 5, Dhanmondi, Dhaka |
| `YOUR_CLINIC_PHONE` | Clinic phone number | e.g. 01711000000 |
| `YOUR_N8N_BASE_URL` | Your n8n base URL | e.g. https://xxx.app.n8n.cloud |
| `YOUR_NEXT_JS_URL` | Your deployed Next.js app URL | e.g. https://clinic.vercel.app |
| `YOUR_ERROR_WORKFLOW_ID` | Workflow ID of `00_error_handler` | n8n → Workflows → Error Handler → ID in URL |

---

## Step 3 — After Import: Connect Credentials

After importing each workflow, n8n will show credential errors. Fix them:

1. Click on any red node
2. Click the credential dropdown
3. Select your saved credential (Google or Airtable)
4. Repeat for every node in every workflow

---

## Step 4 — Activate Workflows

Toggle each workflow **Active** after connecting credentials. The order:

1. `00 — Error Handler` → Active
2. `01 — New Booking` → Active
3. `02 — Reminders` → Active
4. `03 — Cancellation` → Active
5. `04 — Reschedule` → Active
6. `05 — Daily Summary` → Active
7. `06 — Admin & Doctor Panel API` → Active

---

## Step 5 — Airtable Fields Required

Your Airtable `Appointments` table must have these exact field names:

| Field Name | Type |
|---|---|
| Booking ID | Single line text |
| Patient Name | Single line text |
| Email | Email |
| Phone | Phone number |
| Appointment Date | Date |
| Appointment Time | Single line text |
| Appointment Type | Single select |
| Reason for Visit | Long text |
| Age | Number |
| Gender | Single select |
| Notes | Long text |
| Status | Single select |
| Google Calendar Event ID | Single line text |
| Confirmation Sent | Checkbox |
| Reminder 24h Sent | Checkbox |
| Reminder 2h Sent | Checkbox |
| Booking ID | Single line text |
| Submitted At | Single line text |
| Cancellation Reason | Long text |
| Cancelled At | Single line text |
| Reschedule Reason | Long text |
| Rescheduled At | Single line text |
| Admin Notes | Long text |
| Updated At | Single line text |

**Single select options for Status:**
Booked, Confirmed, Rescheduled, Cancelled, Completed, No-show

**Single select options for Appointment Type:**
New Consultation, Follow-up, Report Review, Emergency / Urgent

---

## Webhook Endpoints Reference

Use these URLs in your Next.js app. Replace `YOUR_N8N_BASE_URL` with your actual n8n URL.

### Booking Form (Next.js patient form)
```
POST YOUR_N8N_BASE_URL/webhook/new-booking

Body (JSON):
{
  "name": "Patient Full Name",
  "email": "patient@email.com",
  "phone": "01711000000",
  "date": "2025-06-02",
  "time": "15:00",
  "appointmentType": "New Consultation",
  "reason": "Headache",
  "age": "32",
  "gender": "Male",
  "notes": "Optional notes",
  "consent": true
}

Response: { "success": true, "message": "Appointment received" }
```

### Reschedule (Next.js reschedule page)
```
POST YOUR_N8N_BASE_URL/webhook/reschedule

Body (JSON):
{
  "bookingId": "BK-1234567-123",
  "email": "patient@email.com",
  "newDate": "2025-06-05",
  "newTime": "16:00",
  "reason": "Conflict with work"
}

Response: { "success": true, "message": "Appointment rescheduled successfully" }
```

### Cancellation (triggered from email link — GET request)
```
GET YOUR_N8N_BASE_URL/webhook/cancel?bookingId=BK-1234567-123&email=patient@email.com

Response: HTML page shown to patient
```

### Admin Panel — Get All Appointments
```
GET YOUR_N8N_BASE_URL/webhook/admin/appointments

Response:
{
  "appointments": [ { "id": "recXXX", "Patient Name": "...", "Status": "Confirmed", ... } ],
  "total": 45
}
```

### Admin Panel — Get Today's Appointments
```
GET YOUR_N8N_BASE_URL/webhook/admin/appointments/today

Response:
{
  "appointments": [ ... ],
  "upcoming": 3,
  "total": 5
}
```

### Admin/Doctor Panel — Update Appointment Status
```
POST YOUR_N8N_BASE_URL/webhook/admin/status

Body (JSON):
{
  "recordId": "recXXXXXXXXXXXXXX",
  "status": "Completed",
  "notes": "Patient came on time. Prescription given."
}

Allowed statuses: Booked, Confirmed, Completed, No-show, Cancelled, Rescheduled

Response: { "success": true, "status": "Completed" }
```

### Admin Panel — Get Dashboard Stats
```
GET YOUR_N8N_BASE_URL/webhook/admin/stats

Response:
{
  "total": 120,
  "booked": 5,
  "confirmed": 8,
  "completed": 95,
  "cancelled": 7,
  "noShow": 3,
  "rescheduled": 2,
  "byType": {
    "newConsultation": 60,
    "followUp": 40,
    "reportReview": 15,
    "emergency": 5
  }
}
```

---

## How to Use in Next.js

### Fetch all appointments (admin panel)
```javascript
const res = await fetch(`${process.env.NEXT_PUBLIC_N8N_URL}/webhook/admin/appointments`);
const data = await res.json();
// data.appointments = array of all appointments
```

### Submit new booking (patient form)
```javascript
const res = await fetch(`${process.env.NEXT_PUBLIC_N8N_URL}/webhook/new-booking`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});
const result = await res.json();
// result.success = true
```

### Mark appointment as completed (doctor panel)
```javascript
const res = await fetch(`${process.env.NEXT_PUBLIC_N8N_URL}/webhook/admin/status`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recordId: appointment.id,
    status: 'Completed',
    notes: doctorNotes
  })
});
```

### Environment variable to add in Next.js (.env.local)
```
NEXT_PUBLIC_N8N_URL=https://your-n8n-url.app.n8n.cloud
```

---

## Testing Each Workflow

### Test Workflow 1 (New Booking)
1. Open workflow → click **Test workflow**
2. Or submit your form → check Airtable + Calendar + email

### Test Workflow 2 (Reminders)
1. Create a test record in Airtable with today's date + 24 hours from now as time
2. Open the Reminders workflow → **Test workflow**
3. Check if reminder email arrives

### Test Workflow 3 (Cancellation)
1. Get a Booking ID from Airtable
2. Open browser: `YOUR_N8N_BASE_URL/webhook/cancel?bookingId=BK-XXX&email=your@email.com`
3. Check Airtable status → should be Cancelled
4. Check Google Calendar → event should be deleted

### Test Workflow 4 (Reschedule)
1. Use Postman or hoppscotch.io
2. POST to `YOUR_N8N_BASE_URL/webhook/reschedule` with JSON body
3. Check Airtable + Calendar updated

### Test Workflow 5 (Daily Summary)
1. Open workflow → **Test workflow** (runs immediately)
2. Check staff email for the summary table

### Test Workflow 6 (Admin API)
1. Open browser: `YOUR_N8N_BASE_URL/webhook/admin/appointments/today`
2. You should see JSON with today's appointments

---

## Common Errors and Fixes

| Error | Cause | Fix |
|---|---|---|
| `Cannot read fields of undefined` | Airtable returned empty result | Check your Base ID and table name match exactly |
| `Invalid date` in Calendar | Date/time format wrong | Make sure date is `YYYY-MM-DD` and time is `HH:MM` |
| `401 Unauthorized` from Airtable | Token expired or wrong | Reconnect Airtable credential in n8n |
| `401` from Google | OAuth token expired | Reconnect Google credential in n8n |
| Emails not sending | Gmail quota hit or credential issue | Check n8n execution log for exact error |
| Webhook returns 404 | Workflow not Active | Toggle the workflow Active switch |
| CORS error in Next.js | Missing headers | The API workflow already adds `Access-Control-Allow-Origin: *` |
