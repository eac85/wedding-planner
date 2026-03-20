import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/serverClient";

type GeneratedTask = {
  task: string;
  when: string;
  cat: string;
};

function extractTextFromAnthropicResponse(data: unknown) {
  // Anthropic "messages" API typically returns: { content: [{ type: 'text', text: '...' }], ... }
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

function extractJsonArray(text: string) {
  // Model may wrap in ```json ... ```; strip and then find first/last [ ]
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  const slice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice);
}

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as { weddingId?: unknown }));
  const weddingId = (body?.weddingId ?? "").toString();
  if (!weddingId) return NextResponse.json({ error: "Missing weddingId" }, { status: 400 });

  // Membership check (RLS will also cover writes, but this makes errors clearer)
  const { data: membership } = await supabase
    .from("wedding_members")
    .select("role")
    .eq("wedding_id", weddingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) return NextResponse.json({ error: "Not a member of this wedding" }, { status: 403 });

  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";

  const allowedWhen = [
    "12+ months out",
    "10-12 months out",
    "8-10 months out",
    "6-8 months out",
    "4-6 months out",
    "2-4 months out",
    "1-2 months out",
    "2 weeks out",
    "Week of wedding",
    "Day of",
  ];

  const prompt = `Generate a wedding planning checklist of 20 essential tasks.
Respond ONLY with a JSON array of objects with keys:
- task (string)
- when (one of: ${allowedWhen.map((x) => `"${x}"`).join(", ")})
- cat (category string)
No markdown. No preamble. Output JSON only.`;

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
      system: "You are a warm, practical wedding planning assistant.",
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => "");
    return NextResponse.json(
      { error: "Anthropic request failed", details: errText.slice(0, 2000) },
      { status: 500 }
    );
  }

  const data = await anthropicRes.json();
  const text = extractTextFromAnthropicResponse(data);

  try {
    const parsed = extractJsonArray(text) as GeneratedTask[];
    const safeTasks = Array.isArray(parsed) ? parsed : [];

    const tasksToInsert = safeTasks
      .filter((t) => t && typeof t.task === "string" && typeof t.cat === "string" && typeof t.when === "string")
      .map((t) => ({
        wedding_id: weddingId,
        task: t.task.trim(),
        when_label: t.when,
        cat: t.cat,
        done: false,
      }));

    if (!tasksToInsert.length) {
      return NextResponse.json({ error: "Model returned no tasks" }, { status: 500 });
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("tasks")
      .insert(tasksToInsert)
      .select("*");

    if (insertErr) {
      return NextResponse.json({ error: "Failed to insert tasks" }, { status: 500 });
    }

    return NextResponse.json({ tasks: inserted ?? [] });
  } catch (e) {
    return NextResponse.json(
      {
        error: "Failed to parse tasks JSON",
        details: String((e as { message?: unknown } | undefined)?.message ?? e).slice(0, 2000),
        raw: text.slice(0, 2000),
      },
      { status: 500 }
    );
  }
}

