import { createClient, createServiceClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = await createServiceClient();

    const { data: character } = await serviceClient
      .from("character_dna")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!character || character.user_id !== user.id) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const { data: versions, error } = await serviceClient
      .from("dna_versions")
      .select("*")
      .eq("character_id", id)
      .order("version", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ versions });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
