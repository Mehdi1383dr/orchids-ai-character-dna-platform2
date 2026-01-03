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

  const { data: settings } = await supabase
    .from("system_settings")
    .select("*")
    .order("category");

  return NextResponse.json({ settings: settings || [] });
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

  if (!admin || !admin.permissions.includes("manage_system_settings")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { key, value, reason } = body;

  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  const { data: oldSetting } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .single();

  const { error } = await supabase
    .from("system_settings")
    .update({ value, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("key", key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("admin_audit_logs").insert({
    admin_id: admin.id,
    admin_role: admin.role,
    action_type: "setting_updated",
    target_type: "system_setting",
    target_id: key,
    reason: reason || "Setting updated",
    changes: { oldValue: oldSetting?.value, newValue: value },
  });

  return NextResponse.json({ success: true });
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

  if (!admin || !admin.permissions.includes("manage_system_settings")) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { key, value, description, category } = body;

  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  const { error } = await supabase.from("system_settings").insert({
    key,
    value,
    description,
    category: category || "general",
    updated_by: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
