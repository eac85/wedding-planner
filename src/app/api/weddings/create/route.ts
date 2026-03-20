import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { supabaseService } from "@/lib/supabase/serviceClient";

export async function POST(req: Request) {
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as { name?: unknown }));
    const nameRaw = (body?.name ?? "").toString();
    const name = nameRaw.trim() || "My Wedding";

    // Service-role inserts avoid RLS complexity for initial wedding ownership.
    const supabaseSvc = supabaseService();
    const { data: wedding, error: weddingErr } = await supabaseSvc
      .from("weddings")
      .insert({ name, created_by: user.id })
      .select("id")
      .single();

    if (weddingErr || !wedding) {
      return NextResponse.json({ error: "Failed to create wedding" }, { status: 500 });
    }

    const { error: memberErr } = await supabaseSvc.from("wedding_members").insert({
      wedding_id: wedding.id,
      user_id: user.id,
      role: "owner",
    });

    if (memberErr) {
      return NextResponse.json({ error: "Failed to create membership" }, { status: 500 });
    }

    return NextResponse.json({ weddingId: wedding.id, name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json(
      { error: `Create wedding configuration error: ${message}` },
      { status: 500 }
    );
  }
}

