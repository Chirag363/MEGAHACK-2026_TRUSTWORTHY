import { NextResponse } from "next/server";

const BACKEND_BASE_URL =
  process.env.BACKEND_API_URL ?? process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://127.0.0.1:8000";

export function backendApiUrl(path: string): string {
  return `${BACKEND_BASE_URL}${path}`;
}

export async function relayBackendJson(response: Response) {
  const raw = await response.text();
  let payload: unknown = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = { detail: raw };
    }
  }

  if (!response.ok) {
    const detail =
      typeof payload === "object" && payload !== null && "detail" in payload
        ? (payload as { detail?: string }).detail
        : undefined;
    return NextResponse.json(
      {
        error: detail || `Backend request failed with status ${response.status}`,
      },
      { status: response.status }
    );
  }

  return NextResponse.json(payload, { status: response.status });
}
