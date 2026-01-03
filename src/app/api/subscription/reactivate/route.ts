import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { SUBSCRIPTION_PLANS } from "@/lib/types/character-dna";
import type { SubscriptionPlan } from "@/lib/types/subscription";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    
    const { data: subscription } = await serviceClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (!subscription.cancel_at_period_end) {
      return NextResponse.json({ error: "Subscription is not scheduled for cancellation" }, { status: 400 });
    }

    const now = new Date();

    await serviceClient
      .from("subscriptions")
      .update({
        cancel_at_period_end: false,
        canceled_at: null,
        pending_plan: null,
        pending_plan_effective_date: null,
        updated_at: now.toISOString(),
      })
      .eq("id", subscription.id);

    await serviceClient.from("subscription_events").insert({
      user_id: user.id,
      subscription_id: subscription.id,
      event_type: "reactivated",
      from_plan: subscription.plan,
      to_plan: subscription.plan,
      metadata: { reactivated_at: now.toISOString() },
    });

    const plan = subscription.plan as SubscriptionPlan;
    const planConfig = SUBSCRIPTION_PLANS[plan];

    return NextResponse.json({
      success: true,
      message: `Your ${plan} subscription has been reactivated. You will continue to be billed.`,
      plan,
      monthlyTokens: planConfig.monthlyTokens,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
