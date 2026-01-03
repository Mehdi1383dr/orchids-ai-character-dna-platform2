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

  const hasPermission = await adminEconomyEngine.checkPermission(adminResult.data!, "view_token_analytics");
  if (!hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const result = await adminEconomyEngine.getTokenClassConfigs();

  return NextResponse.json({ tokenConfigs: result.data });
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

  const hasPermission = await adminEconomyEngine.checkPermission(adminResult.data!, "manage_token_classes");
  if (!hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { tokenClass, updates, reason } = body;

  if (!tokenClass || !updates || !reason) {
    return NextResponse.json({ error: "tokenClass, updates, and reason required" }, { status: 400 });
  }

  const result = await adminEconomyEngine.updateTokenClassConfig(user.id, tokenClass, updates, reason);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ tokenConfig: result.data });
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

  const hasPermission = await adminEconomyEngine.checkPermission(adminResult.data!, "execute_token_operations");
  if (!hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { userId, tokenClass, amount, reason } = body;

  if (!userId || !tokenClass || !amount || !reason) {
    return NextResponse.json({ error: "userId, tokenClass, amount, and reason required" }, { status: 400 });
  }

  const result = await adminEconomyEngine.grantTokensToUser(user.id, userId, tokenClass, amount, reason);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
