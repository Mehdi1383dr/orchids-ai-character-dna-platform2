import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.user) {
      const serviceClient = await createServiceClient();
      
      const { data: existingProfile } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (!existingProfile) {
        await serviceClient.from("profiles").insert({
          id: data.user.id,
          email: data.user.email,
          phone: data.user.phone,
          display_name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0],
          avatar_url: data.user.user_metadata?.avatar_url,
          onboarding_completed: false,
        });

        await serviceClient.from("subscriptions").insert({
          user_id: data.user.id,
          plan: "free",
          status: "active",
        });

        await serviceClient.from("token_balances").insert({
          user_id: data.user.id,
          balance: 100,
          lifetime_earned: 100,
        });

        await serviceClient.from("token_transactions").insert({
          user_id: data.user.id,
          amount: 100,
          type: "credit",
          reason: "signup_bonus",
          description: "Welcome bonus tokens",
        });

        return NextResponse.redirect(`${origin}/onboarding`);
      }

      const { data: profile } = await serviceClient
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", data.user.id)
        .single();

      if (!profile?.onboarding_completed) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/error`);
}
