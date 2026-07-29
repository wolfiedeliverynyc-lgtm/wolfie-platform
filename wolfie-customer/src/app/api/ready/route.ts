import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ready",
    service: "wolfie-customer",
    timestamp: new Date().toISOString()
  });
}
