import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getLedgerHistory } from "@/lib/services/ledger-service";
import { ACTION_LABELS } from "@/lib/types/ledger";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { entries, total } = await getLedgerHistory(user.id, limit, offset);

    const formattedEntries = entries.map(entry => ({
      ...entry,
      actionLabel: entry.actionType ? ACTION_LABELS[entry.actionType] || entry.actionType : null,
    }));

    return NextResponse.json({
      entries: formattedEntries,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + entries.length < total,
      },
    });
  } catch (error) {
    console.error("Ledger history error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
