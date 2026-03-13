import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { backendApiUrl, relayBackendJson } from "@/app/api/chat/_utils";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    message?: string;
  };

  const message = payload.message?.trim();
  if (!payload.sessionId || !message) {
    return NextResponse.json(
      { error: "sessionId and message are required" },
      { status: 400 }
    );
  }

  const response = await fetch(backendApiUrl("/api/v1/chat/message"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: payload.sessionId,
      message,
      user_id: userId,
    }),
  });

  return relayBackendJson(response);
}
