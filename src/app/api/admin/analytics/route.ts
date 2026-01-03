import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const supabase = await createServiceClient();
  
  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!admin) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsersRes,
    activeUsersRes,
    newUsersWeekRes,
    newUsersMonthRes,
    totalCharactersRes,
    totalTokensRes,
    subscriptionStatsRes,
    recentLoginsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthAgo.toISOString()),
    supabase.from("character_dna").select("id", { count: "exact", head: true }).eq("is_demo", false),
    supabase.from("token_balances").select("balance, lifetime_spent"),
    supabase.from("subscriptions").select("plan, status"),
    supabase.from("profiles").select("last_login_at").not("last_login_at", "is", null).gte("last_login_at", weekAgo.toISOString()),
  ]);

  const totalTokens = totalTokensRes.data?.reduce((sum, t) => sum + (t.balance || 0), 0) || 0;
  
  const subscriptionBreakdown: Record<string, number> = { free: 0 };
  subscriptionStatsRes.data?.forEach((s) => {
    if (s.status === "active") {
      subscriptionBreakdown[s.plan] = (subscriptionBreakdown[s.plan] || 0) + 1;
    }
  });
  
  const usersWithoutSub = (totalUsersRes.count || 0) - Object.values(subscriptionBreakdown).reduce((a, b) => a + b, 0);
  if (usersWithoutSub > 0) {
    subscriptionBreakdown["free"] = (subscriptionBreakdown["free"] || 0) + usersWithoutSub;
  }

  const dailyStats = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    
    const { count: signups } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", date.toISOString())
      .lt("created_at", nextDate.toISOString());

    dailyStats.push({
      date: date.toISOString().split("T")[0],
      signups: signups || 0,
    });
  }

  return NextResponse.json({
    analytics: {
      users: {
        total: totalUsersRes.count || 0,
        active: activeUsersRes.count || 0,
        newThisWeek: newUsersWeekRes.count || 0,
        newThisMonth: newUsersMonthRes.count || 0,
        activeThisWeek: recentLoginsRes.data?.length || 0,
      },
      characters: {
        total: totalCharactersRes.count || 0,
      },
      tokens: {
        totalInCirculation: totalTokens,
        totalSpent: totalTokensRes.data?.reduce((sum, t) => sum + (t.lifetime_spent || 0), 0) || 0,
      },
      subscriptions: subscriptionBreakdown,
      dailyStats,
    },
  });
}
