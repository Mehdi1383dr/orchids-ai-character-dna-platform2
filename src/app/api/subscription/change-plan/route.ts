import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { 
  isUpgrade, 
  isDowngrade, 
  calculateProration,
  PLAN_PRICES_CENTS,
  type SubscriptionPlan,
} from "@/lib/types/subscription";
import { SUBSCRIPTION_PLANS } from "@/lib/types/character-dna";

const changePlanSchema = z.object({
  newPlan: z.enum(["free", "basic", "pro", "enterprise"]),
  paymentMethod: z.enum(["stripe", "crypto"]).optional(),
  immediate: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { newPlan, immediate } = changePlanSchema.parse(body);

    const serviceClient = await createServiceClient();
    
    const { data: subscription } = await serviceClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    const currentPlan = subscription.plan as SubscriptionPlan;

    if (currentPlan === newPlan) {
      return NextResponse.json({ error: "Already on this plan" }, { status: 400 });
    }

    const now = new Date();
    const periodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end) 
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const periodStart = subscription.current_period_start 
      ? new Date(subscription.current_period_start) 
      : now;

    const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    if (isUpgrade(currentPlan, newPlan)) {
      const proratedAmount = calculateProration(currentPlan, newPlan, daysRemaining, totalDays);
      
      const newPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await serviceClient
        .from("subscriptions")
        .update({
          plan: newPlan,
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
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
        event_type: "upgraded",
        from_plan: currentPlan,
        to_plan: newPlan,
        amount_cents: proratedAmount,
        metadata: { 
          prorated: true, 
          days_remaining: daysRemaining,
          immediate: true,
        },
      });

      const newPlanConfig = SUBSCRIPTION_PLANS[newPlan];
      const { data: tokenBalance } = await serviceClient
        .from("token_balances")
        .select("balance, lifetime_earned")
        .eq("user_id", user.id)
        .single();

      if (tokenBalance) {
        const bonusTokens = newPlanConfig.monthlyTokens;
        await serviceClient
          .from("token_balances")
          .update({
            balance: tokenBalance.balance + bonusTokens,
            lifetime_earned: tokenBalance.lifetime_earned + bonusTokens,
            updated_at: now.toISOString(),
          })
          .eq("user_id", user.id);

        await serviceClient.from("token_transactions").insert({
          user_id: user.id,
          amount: bonusTokens,
          type: "credit",
          reason: "subscription",
          description: `Upgraded to ${newPlan} plan`,
          metadata: { plan: newPlan },
        });
      }

      return NextResponse.json({
        success: true,
        action: "upgraded",
        newPlan,
        effectiveDate: now.toISOString(),
        proratedAmount,
        message: `Upgraded to ${newPlan}. New billing cycle started.`,
      });
    }

    if (isDowngrade(currentPlan, newPlan)) {
      if (immediate && newPlan === "free") {
        await serviceClient
          .from("subscriptions")
          .update({
            plan: "free",
            status: "active",
            cancel_at_period_end: false,
            pending_plan: null,
            pending_plan_effective_date: null,
            updated_at: now.toISOString(),
          })
          .eq("id", subscription.id);

        await serviceClient.from("subscription_events").insert({
          user_id: user.id,
          subscription_id: subscription.id,
          event_type: "downgraded",
          from_plan: currentPlan,
          to_plan: "free",
          metadata: { immediate: true },
        });

        return NextResponse.json({
          success: true,
          action: "downgraded",
          newPlan: "free",
          effectiveDate: now.toISOString(),
          message: "Downgraded to free plan immediately.",
        });
      }

      await serviceClient
        .from("subscriptions")
        .update({
          pending_plan: newPlan,
          pending_plan_effective_date: periodEnd.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", subscription.id);

      await serviceClient.from("subscription_events").insert({
        user_id: user.id,
        subscription_id: subscription.id,
        event_type: "downgraded",
        from_plan: currentPlan,
        to_plan: newPlan,
        metadata: { 
          scheduled: true,
          effective_date: periodEnd.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        action: "downgrade_scheduled",
        currentPlan,
        newPlan,
        effectiveDate: periodEnd.toISOString(),
        message: `Downgrade to ${newPlan} scheduled for ${periodEnd.toLocaleDateString()}. You keep ${currentPlan} access until then.`,
      });
    }

    return NextResponse.json({ error: "Invalid plan change" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
