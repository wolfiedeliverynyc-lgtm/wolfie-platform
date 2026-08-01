import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "wolfie-admin",
    timestamp: new Date().toISOString()
  });
}
