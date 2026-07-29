import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "wolfie-customer",
    environment: process.env.NODE_ENV || "development",
    version: "1.1.0",
    timestamp: new Date().toISOString()
  });
}
