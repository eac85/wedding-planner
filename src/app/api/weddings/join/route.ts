import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";
import { supabaseService } from "@/lib/supabase/serviceClient";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as { code?: unknown }));
  const code = (body?.code ?? "").toString().trim();
  if (!code) {
    return NextResponse.json({ error: "Missing invite code" }, { status: 400 });
  }

  const supabaseSvc = supabaseService();
  const { data: invite, error: inviteErr } = await supabaseSvc
    .from("wedding_invites")
    .select("id,wedding_id,expires_at,consumed_at")
    .eq("code", code)
    .is("consumed_at", null)
    .gte("expires_at", new Date().toISOString())
    .maybeSingle();

  if (inviteErr || !invite) {
    return NextResponse.json({ error: "Invalid or expired invite code" }, { status: 400 });
  }

  // Ensure they are not already a member
  const { data: existing } = await supabaseSvc
    .from("wedding_members")
    .select("wedding_id")
    .eq("wedding_id", invite.wedding_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberErr } = await supabaseSvc.from("wedding_members").insert({
      wedding_id: invite.wedding_id,
      user_id: user.id,
      role: "member",
    });
    if (memberErr) {
      return NextResponse.json({ error: "Failed to join wedding" }, { status: 500 });
    }
  }

  // Consume invite
  const { error: consumeErr } = await supabaseSvc
    .from("wedding_invites")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", invite.id);
  if (consumeErr) {
    // Non-fatal for joining, but we should surface it.
    return NextResponse.json({ error: "Joined, but failed to consume invite" }, { status: 500 });
  }

  return NextResponse.json({ weddingId: invite.wedding_id });
}

