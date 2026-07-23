import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Hello, Oparax!",
    timestamp: new Date().toISOString(),
  });
}
