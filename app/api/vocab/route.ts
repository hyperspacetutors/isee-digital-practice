import { NextRequest, NextResponse } from "next/server";
import { fetchVocabList } from "@/lib/vocab";

export async function GET(req: NextRequest) {
  const list = req.nextUrl.searchParams.get("list");
  if (!list) return NextResponse.json({ error: "list required" }, { status: 400 });
  return NextResponse.json(await fetchVocabList(list));
}
