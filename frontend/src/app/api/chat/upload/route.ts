import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { backendApiUrl, relayBackendJson } from "@/app/api/chat/_utils";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const incoming = await request.formData();
  const file = incoming.get("file");
  const sessionId = incoming.get("sessionId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A dataset file is required." }, { status: 400 });
  }

  const formData = new FormData();
  formData.set("file", file);
  if (typeof sessionId === "string" && sessionId.trim()) {
    formData.set("session_id", sessionId.trim());
  }
  formData.set("user_id", userId);

  const response = await fetch(backendApiUrl("/api/v1/chat/upload"), {
    method: "POST",
    body: formData,
  });

  return relayBackendJson(response);
}
