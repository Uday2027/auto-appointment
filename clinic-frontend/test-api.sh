#!/bin/bash
# Quick curl tests for the Clinic Booking API
# Run: chmod +x test-api.sh && ./test-api.sh

NEXTJS_URL="${NEXTJS_URL:-http://localhost:3000}"
N8N_URL="${N8N_URL:-http://localhost:5678}"

echo "========================================"
echo "  MedCare Clinic API Test Script"
echo "========================================"
echo ""

echo "1. Health check (Next.js app):"
curl -s "$NEXTJS_URL/api/health" | python3 -m json.tool 2>/dev/null || curl -s "$NEXTJS_URL/api/health"
echo ""
echo ""

echo "2. New Booking via Next.js proxy:"
curl -s -X POST "$NEXTJS_URL/api/book" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Patient",
    "email": "test@example.com",
    "phone": "01711000000",
    "date": "2025-06-15",
    "time": "14:00",
    "appointmentType": "New Consultation",
    "reason": "Headache",
    "age": "30",
    "gender": "Male",
    "notes": "First visit",
    "consent": true
  }' | python3 -m json.tool 2>/dev/null || echo "(raw response below)" && curl -s -X POST "$NEXTJS_URL/api/book" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","email":"test@example.com","phone":"01711000000","date":"2025-06-15","time":"14:00","appointmentType":"New Consultation","reason":"Headache","age":"30","gender":"Male","notes":"First visit","consent":true}'
echo ""
echo ""

echo "3. New Booking DIRECT to n8n (bypass Next.js):"
curl -s -X POST "$N8N_URL/webhook/new-booking" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Patient Direct",
    "email": "direct@example.com",
    "phone": "01711000000",
    "date": "2025-06-15",
    "time": "15:00",
    "appointmentType": "Follow-up",
    "reason": "Checkup",
    "age": "25",
    "gender": "Female",
    "notes": "",
    "consent": true
  }' | python3 -m json.tool 2>/dev/null || echo "(raw response below)" && curl -s -X POST "$N8N_URL/webhook/new-booking" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient Direct","email":"direct@example.com","phone":"01711000000","date":"2025-06-15","time":"15:00","appointmentType":"Follow-up","reason":"Checkup","age":"25","gender":"Female","notes":"","consent":true}'
echo ""
echo ""

echo "4. Get Appointments via Next.js proxy:"
curl -s "$NEXTJS_URL/api/admin/appointments" | python3 -m json.tool 2>/dev/null || curl -s "$NEXTJS_URL/api/admin/appointments"
echo ""
echo ""

echo "5. Get Appointments DIRECT from n8n:"
curl -s "$N8N_URL/webhook/admin/appointments" | python3 -m json.tool 2>/dev/null || curl -s "$N8N_URL/webhook/admin/appointments"
echo ""
echo ""

echo "========================================"
echo "  Done. Check output above."
echo "========================================"
