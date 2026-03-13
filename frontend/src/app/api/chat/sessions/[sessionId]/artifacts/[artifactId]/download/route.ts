import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { backendApiUrl } from "@/app/api/chat/_utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string; artifactId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId, artifactId } = await params;
  const response = await fetch(
    backendApiUrl(
      `/api/v1/chat/session/${encodeURIComponent(sessionId)}/artifacts/${encodeURIComponent(artifactId)}/download?user_id=${encodeURIComponent(userId)}`
    ),
    {
      method: "GET",
      cache: "no-store",
    }
  );

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "Failed to download artifact.");
    return NextResponse.json(
      { error: detail || `Backend request failed with status ${response.status}` },
      { status: response.status }
    );
  }

  const filename =
    response.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/)?.[1] ??
    "artifact.bin";

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
