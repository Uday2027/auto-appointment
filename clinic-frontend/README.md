# MedCare Clinic — Booking Frontend

Next.js frontend for the Doctor Clinic Appointment System. Connects to n8n webhooks.

## Setup

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.local .env.local
   ```
   Edit `.env.local` and replace `YOUR_N8N_BASE_URL` with your actual n8n URL:
   ```
   NEXT_PUBLIC_N8N_URL=https://xxx.app.n8n.cloud
   ```

3. **Run dev server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Pages

| Route | Purpose |
|---|---|
| `/` | Patient booking form |
| `/reschedule` | Reschedule an existing appointment |
| `/admin` | Admin panel — all appointments + stats |
| `/doctor` | Doctor panel — today's appointments |

## Webhook Integration

This frontend talks to your n8n instance via these endpoints:

- `POST /webhook/new-booking` — Submit new booking
- `POST /webhook/reschedule` — Reschedule appointment
- `GET /webhook/admin/appointments` — List all appointments
- `GET /webhook/admin/appointments/today` — List today's appointments
- `GET /webhook/admin/stats` — Dashboard stats
- `POST /webhook/admin/status` — Update appointment status

Make sure all n8n workflows are **Active** before testing.
