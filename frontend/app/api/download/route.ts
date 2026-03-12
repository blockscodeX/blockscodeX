import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const name = req.nextUrl.searchParams.get("name") || "download";

  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });
    }

    const blob = await res.blob();
    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("content-type") || "application/octet-stream");
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(name)}"`);
    if (res.headers.get("content-length")) {
      headers.set("Content-Length", res.headers.get("content-length")!);
    }

    return new NextResponse(blob, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
