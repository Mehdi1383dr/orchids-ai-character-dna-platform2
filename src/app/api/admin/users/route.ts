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

  if (!admin || !admin.permissions.includes("manage_users")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "all";
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" });

  if (search) {
    query = query.or(`email.ilike.%${search}%,display_name.ilike.%${search}%,username.ilike.%${search}%`);
  }

  if (status !== "all") {
    query = query.eq("account_status", status);
  }

  const { data: users, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = users?.map(u => u.id) || [];
  
  const [tokenRes, subRes, charRes] = await Promise.all([
    supabase.from("token_balances").select("user_id, balance, lifetime_spent").in("user_id", userIds),
    supabase.from("subscriptions").select("user_id, plan, status").in("user_id", userIds),
    supabase.from("character_dna").select("user_id").in("user_id", userIds).eq("is_demo", false),
  ]);

  const tokenMap = new Map(tokenRes.data?.map(t => [t.user_id, t]) || []);
  const subMap = new Map(subRes.data?.map(s => [s.user_id, s]) || []);
  const charCounts = new Map<string, number>();
  charRes.data?.forEach(c => {
    charCounts.set(c.user_id, (charCounts.get(c.user_id) || 0) + 1);
  });

  const formattedUsers = users?.map(u => ({
    id: u.id,
    email: u.email,
    displayName: u.display_name,
    username: u.username,
    avatarUrl: u.avatar_url,
    accountStatus: u.account_status,
    emailVerified: u.email_verified,
    role: u.role,
    createdAt: u.created_at,
    lastLoginAt: u.last_login_at,
    tokenBalance: tokenMap.get(u.id)?.balance || 0,
    lifetimeSpent: tokenMap.get(u.id)?.lifetime_spent || 0,
    subscription: subMap.get(u.id)?.plan || "free",
    subscriptionStatus: subMap.get(u.id)?.status || "none",
    characterCount: charCounts.get(u.id) || 0,
  }));

  return NextResponse.json({ users: formattedUsers, total: count });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const supabase = await createServiceClient();
  
  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!admin || !admin.permissions.includes("manage_users")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, action, reason, data } = body;

  if (!userId || !action) {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  try {
    switch (action) {
      case "ban": {
        const { error: banError } = await supabase
          .from("profiles")
          .update({ account_status: "banned" })
          .eq("id", userId);
        
        if (banError) throw banError;

        await supabase.from("user_bans").insert({
          user_id: userId,
          reason: reason || "No reason provided",
          banned_by: user.id,
          is_permanent: data?.permanent || false,
          expires_at: data?.expiresAt || null,
        });

        await supabase.from("admin_audit_logs").insert({
          admin_id: admin.id,
          admin_role: admin.role,
          action_type: "user_banned",
          target_type: "user",
          target_id: userId,
          reason,
          changes: { action: "ban", permanent: data?.permanent },
        });
        break;
      }
      case "unban": {
        const { error: unbanError } = await supabase
          .from("profiles")
          .update({ account_status: "active" })
          .eq("id", userId);
        
        if (unbanError) throw unbanError;

        await supabase
          .from("user_bans")
          .update({ is_active: false, unbanned_at: new Date().toISOString(), unbanned_by: user.id })
          .eq("user_id", userId)
          .eq("is_active", true);

        await supabase.from("admin_audit_logs").insert({
          admin_id: admin.id,
          admin_role: admin.role,
          action_type: "user_unbanned",
          target_type: "user",
          target_id: userId,
          reason,
          changes: { action: "unban" },
        });
        break;
      }
      case "reset_tokens": {
        const amount = data?.amount || 1000;
        
        const { data: existingBalance } = await supabase
          .from("token_balances")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (existingBalance) {
          const { error: resetError } = await supabase
            .from("token_balances")
            .update({ balance: amount, updated_at: new Date().toISOString() })
            .eq("user_id", userId);
          if (resetError) throw resetError;
        } else {
          const { error: insertError } = await supabase
            .from("token_balances")
            .insert({ user_id: userId, balance: amount });
          if (insertError) throw insertError;
        }

        await supabase.from("admin_audit_logs").insert({
          admin_id: admin.id,
          admin_role: admin.role,
          action_type: "tokens_reset",
          target_type: "user",
          target_id: userId,
          reason,
          changes: { newBalance: amount },
        });
        break;
      }
      case "grant_tokens": {
        const grantAmount = data?.amount || 100;

        const { data: existingBalance } = await supabase
          .from("token_balances")
          .select("id, balance")
          .eq("user_id", userId)
          .single();

        if (existingBalance) {
          const { error: grantError } = await supabase
            .from("token_balances")
            .update({ 
              balance: existingBalance.balance + grantAmount,
              updated_at: new Date().toISOString()
            })
            .eq("user_id", userId);
          if (grantError) throw grantError;
        } else {
          const { error: insertError } = await supabase
            .from("token_balances")
            .insert({ user_id: userId, balance: grantAmount });
          if (insertError) throw insertError;
        }

        await supabase.from("admin_audit_logs").insert({
          admin_id: admin.id,
          admin_role: admin.role,
          action_type: "tokens_granted",
          target_type: "user",
          target_id: userId,
          reason,
          changes: { grantedAmount: grantAmount },
        });
        break;
      }
      case "change_role": {
        const { error: roleError } = await supabase
          .from("profiles")
          .update({ role: data?.role })
          .eq("id", userId);
        
        if (roleError) throw roleError;

        await supabase.from("admin_audit_logs").insert({
          admin_id: admin.id,
          admin_role: admin.role,
          action_type: "role_changed",
          target_type: "user",
          target_id: userId,
          reason,
          changes: { newRole: data?.role },
        });
        break;
      }
      case "change_subscription": {
        const newPlan = data?.plan;
        if (!newPlan) {
          return NextResponse.json({ error: "Plan is required" }, { status: 400 });
        }

        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id")
          .eq("user_id", userId)
          .single();

        if (existingSub) {
          const { error: subError } = await supabase
            .from("subscriptions")
            .update({ plan: newPlan, updated_at: new Date().toISOString() })
            .eq("user_id", userId);
          if (subError) throw subError;
        } else {
          const { error: insertError } = await supabase
            .from("subscriptions")
            .insert({
              user_id: userId,
              plan: newPlan,
              status: "active",
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });
          if (insertError) throw insertError;
        }

        await supabase.from("admin_audit_logs").insert({
          admin_id: admin.id,
          admin_role: admin.role,
          action_type: "subscription_changed",
          target_type: "user",
          target_id: userId,
          reason,
          changes: { newPlan },
        });
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("User action error:", err);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
