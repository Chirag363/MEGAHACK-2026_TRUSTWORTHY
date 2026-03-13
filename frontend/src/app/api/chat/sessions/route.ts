import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { backendApiUrl, relayBackendJson } from "@/app/api/chat/_utils";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = url.searchParams.get("limit") ?? "50";

  const response = await fetch(
    backendApiUrl(`/api/v1/chat/sessions?user_id=${encodeURIComponent(userId)}&limit=${encodeURIComponent(limit)}`),
    {
      method: "GET",
      cache: "no-store",
    }
  );

  return relayBackendJson(response);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    title?: string;
    sessionId?: string;
  };

  const response = await fetch(backendApiUrl("/api/v1/chat/session"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      title: payload.title,
      session_id: payload.sessionId,
    }),
  });

  return relayBackendJson(response);
}
