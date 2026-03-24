import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/serverClient";
import WeddingPlannerClient from "@/components/wedding/WeddingPlannerClient";

export default async function WeddingPage({
  params,
}: {
  params: Promise<{ weddingId: string }>;
}) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { weddingId } = await params;

  const { data: wedding } = await supabase
    .from("weddings")
    .select("id,name")
    .eq("id", weddingId)
    .maybeSingle();

  if (!wedding) notFound();

  const { data: membership } = await supabase
    .from("wedding_members")
    .select("role")
    .eq("wedding_id", weddingId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isOwner = membership?.role === "owner";

  const memberLabels: Record<string, string> = {};
  const { data: labelRows, error: labelsErr } = await supabase.rpc("wedding_member_labels", {
    _wedding_id: weddingId,
  });
  if (!labelsErr) {
    for (const row of (labelRows ?? []) as { user_id: string; label: string }[]) {
      if (row?.user_id && row?.label) memberLabels[row.user_id] = row.label;
    }
  }

  const [
    { data: vendors },
    budgetResult,
    { data: guests },
    { data: tasks },
    { data: venues },
    { data: venueResearch },
  ] =
    await Promise.all([
      supabase
        .from("vendors")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: true }),
      isOwner
        ? supabase
            .from("budget_categories")
            .select("*")
            .eq("wedding_id", weddingId)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase
        .from("guests")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: true }),
      supabase
        .from("tasks")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: true }),
      supabase
        .from("venues")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: true }),
      supabase
        .from("venue_research")
        .select("*")
        .eq("wedding_id", weddingId)
        .order("created_at", { ascending: true }),
    ]);

  const budgetCategories = isOwner ? budgetResult.data ?? [] : [];

  // AI thread + messages (if they exist yet)
  const { data: thread } = await supabase
    .from("ai_threads")
    .select("id")
    .eq("wedding_id", weddingId)
    .eq("user_id", user.id)
    .maybeSingle();

  let aiMessages: Array<{ role: "user" | "assistant" | "system"; content: string; createdAt: string }> = [];
  if (thread?.id) {
    const { data } = await supabase
      .from("ai_messages")
      .select("role,content,created_at")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true })
      .limit(200);
    const msgs = (data ?? []) as Array<{ role: string; content: string; created_at: string }>;
    aiMessages = msgs.map((m) => ({
      role: (m.role === "user" || m.role === "assistant" || m.role === "system" ? m.role : "assistant") as
        | "user"
        | "assistant"
        | "system",
      content: m.content,
      createdAt: m.created_at,
    }));
  }

  return (
    <WeddingPlannerClient
      weddingId={weddingId}
      weddingName={wedding.name}
      isOwner={isOwner}
      currentUserId={user.id}
      memberLabels={memberLabels}
      initialVendors={vendors ?? []}
      initialBudgetCategories={budgetCategories ?? []}
      initialGuests={guests ?? []}
      initialTasks={tasks ?? []}
      initialVenues={venues ?? []}
      initialVenueResearch={venueResearch ?? []}
      initialAiMessages={aiMessages}
    />
  );
}

