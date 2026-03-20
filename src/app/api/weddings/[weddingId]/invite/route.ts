import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { supabaseService } from "@/lib/supabase/serviceClient";

function genCode() {
  // 16 hex chars: easy to copy/enter
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ weddingId: string }> }
) {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { weddingId } = await params;

  const supabaseSvc = supabaseService();
  const { data: membership } = await supabaseSvc
    .from("wedding_members")
    .select("role")
    .eq("wedding_id", weddingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "Only owners can invite" }, { status: 403 });
  }

  // Retry a couple times in case of rare code collisions.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = genCode();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();

    const { error: inviteErr } = await supabaseSvc.from("wedding_invites").insert({
      wedding_id: weddingId,
      created_by: user.id,
      code,
      expires_at: expiresAt,
    });

    if (!inviteErr) {
      return NextResponse.json({ code, expiresAt });
    }
  }

  return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
}

