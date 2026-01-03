import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return unauthorized();
    }

    const serviceClient = await createServiceClient();

    const [profileResult, subscriptionResult, tokenBalanceResult, charactersResult, adminResult] = await Promise.all([
      serviceClient.from("profiles").select("*").eq("id", user.id).single(),
      serviceClient.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "active").single(),
      serviceClient.from("token_balances").select("*").eq("user_id", user.id).single(),
      serviceClient.from("character_dna").select("id").eq("user_id", user.id).eq("is_demo", false),
      serviceClient.from("admin_users").select("id").eq("user_id", user.id).eq("is_active", true).single(),
    ]);

    return NextResponse.json({
      profile: profileResult.data,
      subscription: subscriptionResult.data,
      tokenBalance: tokenBalanceResult.data,
      characterCount: charactersResult.data?.length || 0,
      isAdmin: !!adminResult.data,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
