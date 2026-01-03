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

  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  const { data: admins } = await supabase
    .from("admin_users")
    .select(`
      *,
      profiles:user_id(email, display_name, avatar_url)
    `)
    .order("created_at", { ascending: false });

  return NextResponse.json({ admins: admins || [] });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const supabase = await createServiceClient();
  
  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, role, permissions } = body;

  if (!userId || !role) {
    return NextResponse.json({ error: "userId and role required" }, { status: 400 });
  }

  const { data: existingAdmin } = await supabase
    .from("admin_users")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existingAdmin) {
    return NextResponse.json({ error: "User is already an admin" }, { status: 400 });
  }

  const defaultPermissions: Record<string, string[]> = {
    super_admin: [
      "view_economic_overview", "view_token_analytics", "view_subscription_analytics",
      "view_ethical_governance", "view_audit_logs", "manage_token_classes",
      "manage_pricing_rules", "manage_subscriptions", "manage_ethical_thresholds",
      "execute_token_operations", "simulate_economic_changes", "manage_users",
      "manage_system_settings", "manage_announcements", "manage_admins"
    ],
    economy_admin: [
      "view_economic_overview", "view_token_analytics", "view_subscription_analytics",
      "manage_token_classes", "manage_pricing_rules", "execute_token_operations",
      "simulate_economic_changes"
    ],
    support_admin: [
      "view_economic_overview", "view_token_analytics", "view_audit_logs",
      "manage_users", "execute_token_operations"
    ],
    viewer: [
      "view_economic_overview", "view_token_analytics", "view_subscription_analytics",
      "view_ethical_governance", "view_audit_logs"
    ],
  };

  const finalPermissions = permissions || defaultPermissions[role] || defaultPermissions.viewer;

  const { data: newAdmin, error } = await supabase
    .from("admin_users")
    .insert({
      user_id: userId,
      role,
      permissions: finalPermissions,
      is_active: true,
      created_at: Date.now(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: admin.id,
    admin_role: admin.role,
    action_type: "admin_created",
    target_type: "admin",
    target_id: newAdmin.id,
    reason: `New ${role} admin created`,
    changes: { role, permissions: finalPermissions },
  });

  return NextResponse.json({ admin: newAdmin });
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

  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { adminId, role, permissions, isActive } = body;

  if (!adminId) {
    return NextResponse.json({ error: "adminId required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (permissions !== undefined) updates.permissions = permissions;
  if (isActive !== undefined) updates.is_active = isActive;

  const { error } = await supabase
    .from("admin_users")
    .update(updates)
    .eq("id", adminId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: admin.id,
    admin_role: admin.role,
    action_type: "admin_updated",
    target_type: "admin",
    target_id: adminId,
    reason: "Admin permissions updated",
    changes: updates,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorized();

  const supabase = await createServiceClient();
  
  const { data: admin } = await supabase
    .from("admin_users")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (!admin || admin.role !== "super_admin") {
    return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const adminId = searchParams.get("id");

  if (!adminId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  if (adminId === admin.id) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("id", adminId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: admin.id,
    admin_role: admin.role,
    action_type: "admin_removed",
    target_type: "admin",
    target_id: adminId,
    reason: "Admin access removed",
    changes: {},
  });

  return NextResponse.json({ success: true });
}
