import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    if (subscription.plan === "free") {
      return NextResponse.json({ error: "Cannot cancel free plan" }, { status: 400 });
    }

    if (subscription.cancel_at_period_end) {
      return NextResponse.json({ error: "Subscription already scheduled for cancellation" }, { status: 400 });
    }

    const now = new Date();

    await serviceClient
      .from("subscriptions")
      .update({
        cancel_at_period_end: true,
        canceled_at: now.toISOString(),
        pending_plan: "free",
        pending_plan_effective_date: subscription.current_period_end,
        updated_at: now.toISOString(),
      })
      .eq("id", subscription.id);

    await serviceClient.from("subscription_events").insert({
      user_id: user.id,
      subscription_id: subscription.id,
      event_type: "canceled",
      from_plan: subscription.plan,
      to_plan: "free",
      metadata: { 
        effective_date: subscription.current_period_end,
        cancel_at_period_end: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Subscription will be canceled at the end of your billing period (${new Date(subscription.current_period_end).toLocaleDateString()}). You keep full access until then.`,
      effectiveDate: subscription.current_period_end,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
