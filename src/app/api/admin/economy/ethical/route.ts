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

  const hasPermission = await adminEconomyEngine.checkPermission(adminResult.data!, "view_ethical_governance");
  if (!hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const result = await adminEconomyEngine.getEthicalGovernanceConfig();

  return NextResponse.json({ ethicalConfig: result.data });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUser(request);

  if (!user) {
    return unauthorized();
  }

  const adminResult = await adminEconomyEngine.verifyAdminAccess(user.id);
  if (!adminResult.success) {
    return NextResponse.json({ error: adminResult.error }, { status: 403 });
  }

  const hasPermission = await adminEconomyEngine.checkPermission(adminResult.data!, "manage_ethical_thresholds");
  if (!hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { updates, reason } = body;

  if (!updates || !reason) {
    return NextResponse.json({ error: "updates and reason required" }, { status: 400 });
  }

  const result = await adminEconomyEngine.updateEthicalGovernanceConfig(user.id, updates, reason);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ethicalConfig: result.data });
}
