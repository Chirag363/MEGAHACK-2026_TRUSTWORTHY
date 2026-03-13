import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { backendApiUrl, relayBackendJson } from "@/app/api/chat/_utils";

export const dynamic = "force-dynamic";
// Disable Next.js response buffering so SSE chunks reach the client immediately.
export const fetchCache = "force-no-store";

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

  const backendResponse = await fetch(
    backendApiUrl("/api/v1/chat/message/stream"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: payload.sessionId,
        message,
        user_id: userId,
      }),
    }
  );

  if (!backendResponse.ok || !backendResponse.body) {
    return relayBackendJson(backendResponse);
  }

  // Explicitly pump the backend ReadableStream chunk-by-chunk.
  // Using `new Response(body)` directly can be silently buffered by Next.js —
  // the pump pattern forces each chunk to be enqueued and flushed immediately.
  const reader = backendResponse.body.getReader();

  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch {
        controller.close();
      }
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}
