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

  const hasPermission = await adminEconomyEngine.checkPermission(adminResult.data!, "view_audit_logs");
  if (!hasPermission) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get("targetType") || undefined;
  const limit = parseInt(searchParams.get("limit") || "100", 10);

  const result = await adminEconomyEngine.getAuditLogs({
    targetType: targetType as any,
    limit,
  });

  return NextResponse.json({ auditLogs: result.data });
}
