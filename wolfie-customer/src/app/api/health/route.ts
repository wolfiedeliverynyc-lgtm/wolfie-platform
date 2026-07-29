import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "wolfie-customer",
    timestamp: new Date().toISOString()
  });
}
