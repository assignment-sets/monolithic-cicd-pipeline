import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      version: "1.1.0",
      message: "Student Management Service is healthy (Zero-Downtime Blue/Green)",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
