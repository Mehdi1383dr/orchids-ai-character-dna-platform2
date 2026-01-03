import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth-utils";
import { adminEconomyEngine } from "@/lib/services/admin-economy-engine";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return unauthorized();
  }

  const adminResult = await adminEconomyEngine.verifyAdminAccess(user.id);
  if (!adminResult.success) {
    return NextResponse.json({ error: adminResult.error }, { status: 403 });
  }

  const hasPermission = await adminEconomyEngine.checkPermission(adminResult.data!, "view_economic_overview");
  if (!hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const result = await adminEconomyEngine.getPricingRuleConfigs();

  return NextResponse.json({ pricingRules: result.data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return unauthorized();
  }

  const adminResult = await adminEconomyEngine.verifyAdminAccess(user.id);
  if (!adminResult.success) {
    return NextResponse.json({ error: adminResult.error }, { status: 403 });
  }

  const hasPermission = await adminEconomyEngine.checkPermission(adminResult.data!, "manage_pricing_rules");
  if (!hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { rule, reason } = body;

  if (!rule || !reason) {
    return NextResponse.json({ error: "rule and reason required" }, { status: 400 });
  }

  const result = await adminEconomyEngine.createPricingRule(user.id, rule, reason);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ pricingRule: result.data });
}
