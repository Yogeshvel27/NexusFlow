import { NextResponse } from "next/server";
import { checkAndSendAlerts } from "@/lib/cron-worker";

export async function GET(req: Request) {
  try {
    const result = await checkAndSendAlerts();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
