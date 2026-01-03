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

  const result = await adminEconomyEngine.getEconomicOverview(user.id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    overview: result.data,
    admin: {
      id: adminResult.data!.id,
      role: adminResult.data!.role,
      permissions: adminResult.data!.permissions,
    },
  });
}
