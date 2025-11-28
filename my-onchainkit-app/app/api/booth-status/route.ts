import { NextResponse } from "next/server";

let paused = false; // in-memory flag (resets on cold start / redeploy)

export async function GET() {
  return NextResponse.json({ paused });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.paused !== "boolean") {
      return new NextResponse("Invalid body", { status: 400 });
    }
    paused = body.paused;
    return NextResponse.json({ paused });
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }
}
