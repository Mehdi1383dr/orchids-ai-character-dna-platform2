import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { 
  getFeatureAccess, 
  getEffectivePlan, 
  shouldApplyPendingPlan,
  isSubscriptionExpired,
  type SubscriptionPlan,
  type SubscriptionStatus
} from "@/lib/types/subscription";
import { SUBSCRIPTION_PLANS } from "@/lib/types/character-dna";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    
    const { data: subscription, error } = await serviceClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error || !subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const sub = {
      id: subscription.id,
      userId: subscription.user_id,
      plan: subscription.plan as SubscriptionPlan,
      status: subscription.status as SubscriptionStatus,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at,
      pendingPlan: subscription.pending_plan as SubscriptionPlan | undefined,
      pendingPlanEffectiveDate: subscription.pending_plan_effective_date,
      createdAt: subscription.created_at,
      updatedAt: subscription.updated_at,
    };

    if (shouldApplyPendingPlan(sub) && sub.pendingPlan) {
      await serviceClient
        .from("subscriptions")
        .update({
          plan: sub.pendingPlan,
          pending_plan: null,
          pending_plan_effective_date: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      await serviceClient.from("subscription_events").insert({
        user_id: user.id,
        subscription_id: subscription.id,
        event_type: "downgraded",
        from_plan: sub.plan,
        to_plan: sub.pendingPlan,
        metadata: { reason: "scheduled_downgrade" },
      });

      sub.plan = sub.pendingPlan;
      sub.pendingPlan = undefined;
      sub.pendingPlanEffectiveDate = undefined;
    }

    if (isSubscriptionExpired(sub) && sub.status === "active") {
      await serviceClient
        .from("subscriptions")
        .update({
          status: "expired",
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription.id);

      await serviceClient.from("subscription_events").insert({
        user_id: user.id,
        subscription_id: subscription.id,
        event_type: "expired",
        from_plan: sub.plan,
        to_plan: "free",
      });

      sub.status = "expired";
    }

    const effectivePlan = getEffectivePlan(sub);
    const featureAccess = getFeatureAccess(effectivePlan, sub.status);
    const planConfig = SUBSCRIPTION_PLANS[effectivePlan];

    return NextResponse.json({
      subscription: sub,
      effectivePlan,
      featureAccess,
      planConfig,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
