import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

function extractTextFromAnthropicResponse(data: unknown) {
  if (data == null) return "";

  const content = (data as { content?: unknown }).content;
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content
      .map((c) => {
        const maybe = c as { text?: unknown };
        return typeof maybe.text === "string" ? maybe.text : "";
      })
      .join("")
      .trim();
  }

  return "";
}

function toAnthropicMessages(history: Array<{ role: "user" | "assistant"; content: string }>) {
  // Anthropic expects roles: user/assistant; content can be a string in the messages API.
  return history.map((m) => ({ role: m.role, content: m.content }));
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as { weddingId?: unknown; message?: unknown }));
  const weddingId = (body?.weddingId ?? "").toString();
  const message = (body?.message ?? "").toString().trim();

  if (!weddingId) return NextResponse.json({ error: "Missing weddingId" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Missing message" }, { status: 400 });

  const { data: membership } = await supabase
    .from("wedding_members")
    .select("role")
    .eq("wedding_id", weddingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Not a member of this wedding" }, { status: 403 });

  // Ensure an AI thread exists for this wedding+user
  let threadId: string | null = null;
  const { data: thread } = await supabase
    .from("ai_threads")
    .select("id")
    .eq("wedding_id", weddingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (thread?.id) {
    threadId = thread.id;
  } else {
    const { data: createdThread, error: createErr } = await supabase
      .from("ai_threads")
      .insert({ wedding_id: weddingId, user_id: user.id })
      .select("id")
      .single();
    if (createErr || !createdThread) {
      // Race condition fallback: re-select
      const { data: thread2 } = await supabase
        .from("ai_threads")
        .select("id")
        .eq("wedding_id", weddingId)
        .eq("user_id", user.id)
        .maybeSingle();
      threadId = thread2?.id ?? null;
    } else {
      threadId = (createdThread as { id?: string } | null | undefined)?.id ?? null;
    }
  }

  if (!threadId) return NextResponse.json({ error: "Failed to initialize AI thread" }, { status: 500 });

  // Persist the user message
  const { error: insertUserErr } = await supabase.from("ai_messages").insert({
    thread_id: threadId,
    wedding_id: weddingId,
    user_id: user.id,
    role: "user",
    content: message,
  });
  if (insertUserErr) return NextResponse.json({ error: "Failed to save user message" }, { status: 500 });

  const { data: history } = await supabase
    .from("ai_messages")
    .select("role,content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(30);

  const historyForModel = toAnthropicMessages(
    ((history ?? []) as Array<{ role: string; content: string }>)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
  );

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const system = "You are a warm, practical wedding planning assistant. Give concise, actionable advice.";

  const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      system,
      messages: historyForModel.length ? historyForModel : [{ role: "user", content: message }],
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => "");
    return NextResponse.json({ error: "Anthropic request failed", details: errText.slice(0, 2000) }, { status: 500 });
  }

  const data = await anthropicRes.json();
  const reply = extractTextFromAnthropicResponse(data);

  // Persist assistant reply
  if (reply) {
    await supabase.from("ai_messages").insert({
      thread_id: threadId,
      wedding_id: weddingId,
      user_id: user.id,
      role: "assistant",
      content: reply,
    });
  }

  return NextResponse.json({ reply });
}

