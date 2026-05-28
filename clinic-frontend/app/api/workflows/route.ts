import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  const filenames = [
    "00_error_handler.json",
    "01_new_booking.json",
    "02_reminders.json",
    "03_cancellation.json",
    "04_reschedule.json",
    "05_daily_summary.json",
    "06_admin_doctor_api.json",
  ];

  try {
    const workflows = await Promise.all(
      filenames.map(async (filename) => {
        const filePath = path.join(process.cwd(), "..", filename);
        const fileContent = await fs.promises.readFile(filePath, "utf8");
        return JSON.parse(fileContent);
      })
    );
    return NextResponse.json({ success: true, workflows });
  } catch (error) {
    console.error("[API /api/workflows] failed to read n8n JSONs:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to read workflows" 
      },
      { status: 500 }
    );
  }
}
