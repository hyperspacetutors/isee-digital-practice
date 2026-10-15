import { NextRequest, NextResponse } from "next/server";
import { fetchTest } from "@/lib/sheets";

export async function GET(req: NextRequest) {
  const testId = req.nextUrl.searchParams.get("testId");
  if (!testId) return NextResponse.json({ error: "testId required" }, { status: 400 });

  return NextResponse.json(await fetchTest(testId));
}
