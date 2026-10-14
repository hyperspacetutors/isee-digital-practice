import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SHEET_BASE_URL ?? "";
  const tabsRaw = process.env.NEXT_PUBLIC_SHEET_TABS ?? "";

  const url = `${baseUrl}&gid=0`;
  let rawText = "";
  let fetchError = "";

  try {
    const res = await fetch(url, { cache: "no-store" });
    rawText = await res.text();
  } catch (e) {
    fetchError = String(e);
  }

  // Show first 500 chars of raw CSV and the first row's characters
  const firstLine = rawText.split("\n")[0] ?? "";
  const firstLineCharCodes = [...firstLine].map((c) => c.charCodeAt(0));

  return NextResponse.json({
    resolvedUrl: url,
    baseUrl,
    tabsRaw,
    fetchError,
    rawPreview: rawText.slice(0, 500),
    firstLineCharCodes,
  });
}
