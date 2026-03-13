import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { backendApiUrl, relayBackendJson } from "@/app/api/chat/_utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const response = await fetch(
    backendApiUrl(
      `/api/v1/chat/session/${encodeURIComponent(sessionId)}?user_id=${encodeURIComponent(userId)}`
    ),
    {
      method: "GET",
      cache: "no-store",
    }
  );

  return relayBackendJson(response);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;
  const response = await fetch(
    backendApiUrl(
      `/api/v1/chat/session/${encodeURIComponent(sessionId)}?user_id=${encodeURIComponent(userId)}`
    ),
    {
      method: "DELETE",
      cache: "no-store",
    }
  );

  return relayBackendJson(response);
}
