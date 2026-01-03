import { SUBSCRIPTION_PLANS } from "./character-dna";

export type SubscriptionPlan = "free" | "basic" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "expired" | "trialing";
export type PaymentMethod = "stripe" | "crypto" | "manual";

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  cryptoWalletAddress?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  endedAt?: string;
  trialEnd?: string;
  pendingPlan?: SubscriptionPlan;
  pendingPlanEffectiveDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionEvent {
  id: string;
  userId: string;
  subscriptionId: string;
  eventType: 
    | "created" | "upgraded" | "downgraded" | "renewed" | "canceled"
    | "reactivated" | "expired" | "payment_failed" | "payment_succeeded"
    | "trial_started" | "trial_ended";
  fromPlan?: SubscriptionPlan;
  toPlan?: SubscriptionPlan;
  amountCents?: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  enterprise: 3,
};

export const PLAN_PRICES_CENTS: Record<SubscriptionPlan, number> = {
  free: 0,
  basic: 1200,
  pro: 3900,
  enterprise: 19900,
};

export function isUpgrade(fromPlan: SubscriptionPlan, toPlan: SubscriptionPlan): boolean {
  return PLAN_HIERARCHY[toPlan] > PLAN_HIERARCHY[fromPlan];
}

export function isDowngrade(fromPlan: SubscriptionPlan, toPlan: SubscriptionPlan): boolean {
  return PLAN_HIERARCHY[toPlan] < PLAN_HIERARCHY[fromPlan];
}

export function calculateProration(
  fromPlan: SubscriptionPlan,
  toPlan: SubscriptionPlan,
  daysRemaining: number,
  totalDaysInPeriod: number
): number {
  const fromPrice = PLAN_PRICES_CENTS[fromPlan];
  const toPrice = PLAN_PRICES_CENTS[toPlan];
  
  const unusedCredit = Math.round((fromPrice * daysRemaining) / totalDaysInPeriod);
  const newCharge = Math.round((toPrice * daysRemaining) / totalDaysInPeriod);
  
  return Math.max(0, newCharge - unusedCredit);
}

export interface FeatureAccess {
  canCreateCharacters: boolean;
  canEditDna: boolean;
  canSimulate: boolean;
  canFineTune: boolean;
  canAccessApi: boolean;
  maxCharacters: number;
  maxTraits: number;
  maxVersionHistory: number;
}

export function getFeatureAccess(plan: SubscriptionPlan, status: SubscriptionStatus): FeatureAccess {
  const isActive = status === "active" || status === "trialing";
  const isPastDue = status === "past_due";
  const planConfig = SUBSCRIPTION_PLANS[plan];
  
  if (!isActive && !isPastDue) {
    return {
      canCreateCharacters: false,
      canEditDna: false,
      canSimulate: false,
      canFineTune: false,
      canAccessApi: false,
      maxCharacters: 0,
      maxTraits: 0,
      maxVersionHistory: 0,
    };
  }

  if (isPastDue) {
    return {
      canCreateCharacters: false,
      canEditDna: false,
      canSimulate: false,
      canFineTune: false,
      canAccessApi: false,
      maxCharacters: planConfig.maxCharacters,
      maxTraits: planConfig.maxTraits,
      maxVersionHistory: planConfig.maxVersionHistory,
    };
  }

  return {
    canCreateCharacters: planConfig.canCreate,
    canEditDna: planConfig.canCreate,
    canSimulate: planConfig.canSimulate,
    canFineTune: planConfig.canFineTune,
    canAccessApi: plan === "enterprise",
    maxCharacters: planConfig.maxCharacters,
    maxTraits: planConfig.maxTraits,
    maxVersionHistory: planConfig.maxVersionHistory,
  };
}

export function getEffectivePlan(subscription: Subscription): SubscriptionPlan {
  if (subscription.status === "expired" || subscription.status === "canceled") {
    if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date()) {
      return subscription.plan;
    }
    return "free";
  }
  return subscription.plan;
}

export function shouldApplyPendingPlan(subscription: Subscription): boolean {
  if (!subscription.pendingPlan || !subscription.pendingPlanEffectiveDate) {
    return false;
  }
  return new Date(subscription.pendingPlanEffectiveDate) <= new Date();
}

export function isSubscriptionExpired(subscription: Subscription): boolean {
  if (!subscription.currentPeriodEnd) return false;
  return new Date(subscription.currentPeriodEnd) < new Date();
}
