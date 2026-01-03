import { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/services/session-service";
import type { AuthUser } from "@/lib/types/auth";

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const result = await verifyAccessToken(token);
  
  if (!result.valid) {
    return null;
  }

  return result.payload;
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
