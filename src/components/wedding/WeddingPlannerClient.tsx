"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/browserClient";
import Modal from "@/components/ui/Modal";
import AiMessageContent from "@/components/wedding/AiMessageContent";

type Vendor = {
  id: string;
  wedding_id: string;
  name: string;
  cat: string;
  contact: string;
  price: string;
  status: "researching" | "contacted" | "booked" | "declined";
  rating: number | null;
  notes: string;
  created_by: string | null;
};

type BudgetCategory = {
  id: string;
  wedding_id: string;
  name: string;
  budget: number;
  est: number;
  actual: number;
  notes: string;
  created_by: string | null;
};

type Guest = {
  id: string;
  wedding_id: string;
  name: string;
  group_name: string;
  rsvp: "pending" | "yes" | "no";
  meal: string;
  notes: string;
  created_by: string | null;
};

type Task = {
  id: string;
  wedding_id: string;
  task: string;
  when_label: string;
  cat: string;
  done: boolean;
  created_by: string | null;
};

type Venue = {
  id: string;
  wedding_id: string;
  name: string;
  location: string;
  capacity: number | null;
  est_price: string;
  status: "researching" | "touring" | "shortlisted" | "booked" | "declined";
  contact: string;
  website: string;
  notes: string;
  created_by: string | null;
};

type VenueResearch = {
  id: string;
  wedding_id: string;
  venue_id: string | null;
  title: string;
  question: string;
  answer: string;
  source: string;
  status: "open" | "answered" | "closed";
  created_by: string | null;
};

type AiMessage = { role: "user" | "assistant" | "system"; content: string; createdAt: string };

const VENUE_CATS = [
  "Venue",
  "Catering",
  "Photography",
  "Florals",
  "Music / DJ",
  "Cake",
  "Hair & makeup",
  "Officiant",
  "Other",
] as const;

const VENDOR_STATUS = ["researching", "contacted", "booked", "declined"] as const;
const VENUE_STATUS = ["researching", "touring", "shortlisted", "booked", "declined"] as const;
const VENUE_RESEARCH_STATUS = ["open", "answered", "closed"] as const;

const GUEST_RSVP_LABEL: Record<Guest["rsvp"], string> = {
  yes: "Attending",
  no: "Declined",
  pending: "Pending",
};

const GUEST_RSVP_COLOR: Record<Guest["rsvp"], string> = {
  yes: "#3B6D11",
  no: "#A32D2D",
  pending: "#854F0B",
};

const TASK_WHEN_ORDER = [
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
] as const;

const TASK_CATS = [
  "Venue & logistics",
  "Vendors",
  "Attire",
  "Beauty",
  "Guest list",
  "Decor",
  "Food & drink",
  "Budget",
  "Other",
] as const;

type TaskWhenLabel = (typeof TASK_WHEN_ORDER)[number];
type TaskCategory = (typeof TASK_CATS)[number];

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function ratingStars(rating: number | null) {
  if (!rating) return null;
  const r = Math.max(1, Math.min(5, Math.floor(Number(rating))));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

export default function WeddingPlannerClient({
  weddingId,
  weddingName,
  isOwner,
  currentUserId,
  memberLabels,
  initialVendors,
  initialBudgetCategories,
  initialGuests,
  initialTasks,
  initialVenues,
  initialVenueResearch,
  initialAiMessages,
}: {
  weddingId: string;
  weddingName: string;
  isOwner: boolean;
  currentUserId: string;
  memberLabels: Record<string, string>;
  initialVendors: Vendor[];
  initialBudgetCategories: BudgetCategory[];
  initialGuests: Guest[];
  initialTasks: Task[];
  initialVenues: Venue[];
  initialVenueResearch: VenueResearch[];
  initialAiMessages: AiMessage[];
}) {
  const supabase = useMemo(() => supabaseBrowserClient(), []);

  function addedByLabel(createdBy: string | null | undefined) {
    if (createdBy == null || createdBy === "") return null;
    if (createdBy === currentUserId) return "You";
    return memberLabels[createdBy] ?? "Member";
  }

  function renderAddedBy(createdBy: string | null | undefined) {
    const label = addedByLabel(createdBy);
    if (!label) return null;
    return <div className="added-by">Added by {label}</div>;
  }

  const [activeTab, setActiveTab] = useState<"venues" | "vendors" | "budget" | "guests" | "tasks" | "ai">("venues");

  const [vendors, setVendors] = useState<Vendor[]>(initialVendors ?? []);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(initialBudgetCategories ?? []);
  const [guests, setGuests] = useState<Guest[]>(initialGuests ?? []);
  const [tasks, setTasks] = useState<Task[]>(initialTasks ?? []);
  const [venues, setVenues] = useState<Venue[]>(initialVenues ?? []);
  const [venueResearch, setVenueResearch] = useState<VenueResearch[]>(initialVenueResearch ?? []);

  const defaultAiGreeting: AiMessage = {
    role: "assistant",
    content:
      "Hi! I'm your wedding planning assistant. I can help you research vendors, suggest questions to ask venues, generate task timelines, estimate budgets, and more. What would you like help with?",
    createdAt: "",
  };
  const [aiMessages, setAiMessages] = useState<AiMessage[]>(
    (initialAiMessages ?? []).length ? (initialAiMessages ?? []) : [defaultAiGreeting]
  );

  useEffect(() => {
    if (!isOwner && activeTab === "budget") {
      setActiveTab("venues");
    }
  }, [isOwner, activeTab]);

  const [vendorFilter, setVendorFilter] = useState<string>("");
  const filteredVendors = useMemo(() => {
    if (!vendorFilter) return vendors;
    return vendors.filter((v) => v.cat === vendorFilter);
  }, [vendors, vendorFilter]);

  const vendorMetrics = useMemo(() => {
    return {
      total: vendors.length,
      booked: vendors.filter((v) => v.status === "booked").length,
      researching: vendors.filter((v) => v.status === "researching").length,
      contacted: vendors.filter((v) => v.status === "contacted").length,
    };
  }, [vendors]);

  const budgetMetrics = useMemo(() => {
    const totalBudget = budgetCategories.reduce((s, b) => s + Number(b.budget || 0), 0);
    const totalEst = budgetCategories.reduce((s, b) => s + Number(b.est || 0), 0);
    const totalActual = budgetCategories.reduce((s, b) => s + Number(b.actual || 0), 0);
    return {
      totalBudget,
      totalEst,
      totalActual,
      remaining: totalBudget - totalActual,
    };
  }, [budgetCategories]);

  const guestMetrics = useMemo(() => {
    return {
      total: guests.length,
      yes: guests.filter((g) => g.rsvp === "yes").length,
      no: guests.filter((g) => g.rsvp === "no").length,
      pending: guests.filter((g) => g.rsvp === "pending").length,
    };
  }, [guests]);

  const taskMetrics = useMemo(() => {
    const doneCount = tasks.filter((t) => t.done).length;
    return {
      total: tasks.length,
      done: doneCount,
      left: tasks.length - doneCount,
    };
  }, [tasks]);

  const venueMetrics = useMemo(() => {
    return {
      total: venues.length,
      booked: venues.filter((v) => v.status === "booked").length,
      researching: venues.filter((v) => v.status === "researching").length,
      touring: venues.filter((v) => v.status === "touring").length,
      researchOpen: venueResearch.filter((r) => r.status === "open").length,
    };
  }, [venues, venueResearch]);

  // ---- Venue modal / form ----
  const [venueModalOpen, setVenueModalOpen] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [venueForm, setVenueForm] = useState({
    name: "",
    location: "",
    capacity: "",
    est_price: "",
    status: "researching" as Venue["status"],
    contact: "",
    website: "",
    notes: "",
  });

  function openVenueModal(v?: Venue) {
    if (v) {
      setEditingVenueId(v.id);
      setVenueForm({
        name: v.name || "",
        location: v.location || "",
        capacity: v.capacity == null ? "" : String(v.capacity),
        est_price: v.est_price || "",
        status: v.status || "researching",
        contact: v.contact || "",
        website: v.website || "",
        notes: v.notes || "",
      });
    } else {
      setEditingVenueId(null);
      setVenueForm({
        name: "",
        location: "",
        capacity: "",
        est_price: "",
        status: "researching",
        contact: "",
        website: "",
        notes: "",
      });
    }
    setVenueModalOpen(true);
  }

  async function saveVenue() {
    const name = venueForm.name.trim();
    if (!name) return;

    const payload = {
      wedding_id: weddingId,
      name,
      location: venueForm.location.trim(),
      capacity: venueForm.capacity === "" ? null : Number(venueForm.capacity),
      est_price: venueForm.est_price.trim(),
      status: venueForm.status,
      contact: venueForm.contact.trim(),
      website: venueForm.website.trim(),
      notes: venueForm.notes.trim(),
    };

    if (editingVenueId) {
      const { data, error } = await supabase
        .from("venues")
        .update(payload)
        .eq("id", editingVenueId)
        .select("*")
        .single();
      if (error || !data) return;
      setVenues((prev) => prev.map((x) => (x.id === editingVenueId ? (data as Venue) : x)));
    } else {
      const { data, error } = await supabase
        .from("venues")
        .insert({ ...payload, created_by: currentUserId })
        .select("*")
        .single();
      if (error || !data) return;
      setVenues((prev) => [...prev, data as Venue]);
    }
    setVenueModalOpen(false);
  }

  async function deleteVenue(venueId: string) {
    const { error } = await supabase.from("venues").delete().eq("id", venueId);
    if (error) return;
    setVenues((prev) => prev.filter((v) => v.id !== venueId));
    setVenueResearch((prev) => prev.filter((r) => r.venue_id !== venueId));
  }

  // ---- Venue research modal / form ----
  const [venueResearchModalOpen, setVenueResearchModalOpen] = useState(false);
  const [venueResearchForm, setVenueResearchForm] = useState({
    venue_id: "",
    title: "",
    question: "",
    answer: "",
    source: "",
    status: "open" as VenueResearch["status"],
  });

  function openVenueResearchModal() {
    setVenueResearchForm({
      venue_id: "",
      title: "",
      question: "",
      answer: "",
      source: "",
      status: "open",
    });
    setVenueResearchModalOpen(true);
  }

  async function saveVenueResearch() {
    const title = venueResearchForm.title.trim();
    if (!title) return;
    const payload = {
      wedding_id: weddingId,
      venue_id: venueResearchForm.venue_id || null,
      title,
      question: venueResearchForm.question.trim(),
      answer: venueResearchForm.answer.trim(),
      source: venueResearchForm.source.trim(),
      status: venueResearchForm.status,
    };
    const { data, error } = await supabase
      .from("venue_research")
      .insert({ ...payload, created_by: currentUserId })
      .select("*")
      .single();
    if (error || !data) return;
    setVenueResearch((prev) => [...prev, data as VenueResearch]);
    setVenueResearchModalOpen(false);
  }

  async function deleteVenueResearch(id: string) {
    const { error } = await supabase.from("venue_research").delete().eq("id", id);
    if (error) return;
    setVenueResearch((prev) => prev.filter((r) => r.id !== id));
  }

  // ---- Vendors modal / form ----
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorForm, setVendorForm] = useState({
    name: "",
    cat: "Venue",
    contact: "",
    price: "",
    status: "researching" as Vendor["status"],
    rating: "",
    notes: "",
  });

  function openVendorModal(v?: Vendor) {
    if (v) {
      setEditingVendorId(v.id);
      setVendorForm({
        name: v.name || "",
        cat: v.cat || "Venue",
        contact: v.contact || "",
        price: v.price || "",
        status: v.status || "researching",
        rating: v.rating == null ? "" : String(v.rating),
        notes: v.notes || "",
      });
    } else {
      setEditingVendorId(null);
      setVendorForm({
        name: "",
        cat: "Venue",
        contact: "",
        price: "",
        status: "researching",
        rating: "",
        notes: "",
      });
    }
    setVendorModalOpen(true);
  }

  async function saveVendor() {
    const name = vendorForm.name.trim();
    if (!name) return;

    const payload = {
      wedding_id: weddingId,
      name,
      cat: vendorForm.cat,
      contact: vendorForm.contact.trim(),
      price: vendorForm.price.trim(),
      status: vendorForm.status,
      rating: vendorForm.rating === "" ? null : Number(vendorForm.rating),
      notes: vendorForm.notes.trim(),
    };

    if (editingVendorId) {
      const { data, error } = await supabase
        .from("vendors")
        .update(payload)
        .eq("id", editingVendorId)
        .select("*")
        .single();
      if (error || !data) return;
      setVendors((prev) => prev.map((x) => (x.id === editingVendorId ? (data as Vendor) : x)));
    } else {
      const { data, error } = await supabase
        .from("vendors")
        .insert({ ...payload, created_by: currentUserId })
        .select("*")
        .single();
      if (error || !data) return;
      setVendors((prev) => [...prev, data as Vendor]);
    }

    setVendorModalOpen(false);
  }

  async function deleteVendor(vendorId: string) {
    const { error } = await supabase.from("vendors").delete().eq("id", vendorId);
    if (error) return;
    setVendors((prev) => prev.filter((v) => v.id !== vendorId));
  }

  // ---- Budget modal / form ----
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    name: "",
    budget: "",
    est: "",
    actual: "",
    notes: "",
  });

  function openBudgetModal() {
    setBudgetForm({ name: "", budget: "", est: "", actual: "", notes: "" });
    setBudgetModalOpen(true);
  }

  async function saveBudget() {
    const name = budgetForm.name.trim();
    if (!name) return;

    const payload = {
      wedding_id: weddingId,
      name,
      budget: parseFloat(budgetForm.budget) || 0,
      est: parseFloat(budgetForm.est) || 0,
      actual: parseFloat(budgetForm.actual) || 0,
      notes: budgetForm.notes.trim(),
    };

    const { data, error } = await supabase
      .from("budget_categories")
      .insert({ ...payload, created_by: currentUserId })
      .select("*")
      .single();
    if (error || !data) return;

    setBudgetCategories((prev) => [...prev, data as BudgetCategory]);
    setBudgetModalOpen(false);
  }

  async function deleteBudget(categoryId: string) {
    const { error } = await supabase.from("budget_categories").delete().eq("id", categoryId);
    if (error) return;
    setBudgetCategories((prev) => prev.filter((b) => b.id !== categoryId));
  }

  // ---- Guest modal / form ----
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [guestForm, setGuestForm] = useState({
    name: "",
    group_name: "",
    rsvp: "pending" as Guest["rsvp"],
    meal: "",
    notes: "",
  });

  function openGuestModal() {
    setGuestForm({ name: "", group_name: "", rsvp: "pending", meal: "", notes: "" });
    setGuestModalOpen(true);
  }

  async function saveGuest() {
    const name = guestForm.name.trim();
    if (!name) return;

    const payload = {
      wedding_id: weddingId,
      name,
      group_name: guestForm.group_name.trim(),
      rsvp: guestForm.rsvp,
      meal: guestForm.meal,
      notes: guestForm.notes.trim(),
    };

    const { data, error } = await supabase
      .from("guests")
      .insert({ ...payload, created_by: currentUserId })
      .select("*")
      .single();
    if (error || !data) return;

    setGuests((prev) => [...prev, data as Guest]);
    setGuestModalOpen(false);
  }

  async function deleteGuest(guestId: string) {
    const { error } = await supabase.from("guests").delete().eq("id", guestId);
    if (error) return;
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
  }

  // ---- Task modal / form ----
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<{
    task: string;
    when_label: TaskWhenLabel;
    cat: TaskCategory;
  }>({
    task: "",
    when_label: TASK_WHEN_ORDER[0],
    cat: TASK_CATS[0],
  });

  function openTaskModal() {
    setTaskForm({ task: "", when_label: TASK_WHEN_ORDER[0], cat: TASK_CATS[0] });
    setTaskModalOpen(true);
  }

  async function saveTask() {
    const taskText = taskForm.task.trim();
    if (!taskText) return;

    const payload = {
      wedding_id: weddingId,
      task: taskText,
      when_label: taskForm.when_label,
      cat: taskForm.cat,
      done: false,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert({ ...payload, created_by: currentUserId })
      .select("*")
      .single();
    if (error || !data) return;

    setTasks((prev) => [...prev, data as Task]);
    setTaskModalOpen(false);
  }

  async function toggleTask(taskId: string) {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    const nextDone = !t.done;

    setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, done: nextDone } : x)));
    const { error } = await supabase.from("tasks").update({ done: nextDone }).eq("id", taskId);
    if (error) {
      // Best-effort rollback
      setTasks((prev) => prev.map((x) => (x.id === taskId ? { ...x, done: t.done } : x)));
    }
  }

  async function deleteTask(taskId: string) {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  // ---- AI assistant ----
  const [aiInput, setAiInput] = useState("");
  const [aiSending, setAiSending] = useState(false);
  const aiMessagesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!aiMessagesRef.current) return;
    aiMessagesRef.current.scrollTop = aiMessagesRef.current.scrollHeight;
  }, [aiMessages, aiSending]);

  async function sendAI(messageText: string) {
    const msg = messageText.trim();
    if (!msg) return;
    setAiSending(true);

    // Keep local UX snappy.
    setAiMessages((prev) => [...prev, { role: "user", content: msg, createdAt: new Date().toISOString() }]);
    setAiInput("");

    try {
      const res = await fetch("/api/anthropic/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId, message: msg }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json();
      const reply = (data?.reply ?? "").toString();
      setAiMessages((prev) => [...prev, { role: "assistant", content: reply, createdAt: new Date().toISOString() }]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again.", createdAt: new Date().toISOString() },
      ]);
    } finally {
      setAiSending(false);
    }
  }

  function quickAsk(q: string) {
    void sendAI(q);
  }

  // ---- AI generate tasks ----
  const [generatingTasks, setGeneratingTasks] = useState(false);

  async function generateTasks() {
    setGeneratingTasks(true);
    try {
      const res = await fetch("/api/anthropic/generate-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weddingId }),
      });
      if (!res.ok) throw new Error("Failed to generate tasks");
      const data = await res.json();
      const newTasks = (data?.tasks ?? []) as Task[];
      if (newTasks.length) setTasks((prev) => [...prev, ...newTasks]);
    } finally {
      setGeneratingTasks(false);
    }
  }

  // ---- Owner invite ----
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  async function createInvite() {
    setInviting(true);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/invite`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to create invite");
      const data = await res.json();
      setInviteCode(data?.code ?? null);
    } finally {
      setInviting(false);
    }
  }

  async function copyInviteCode() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
  }

  return (
    <div className="app">
      <div className="header">
        <h1>{weddingName}</h1>
        <p>Plan the perfect day, together</p>
        {isOwner ? (
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-sm btn-primary" onClick={createInvite} disabled={inviting}>
              {inviting ? "Creating invite..." : "+ Invite collaborator"}
            </button>
            {inviteCode ? (
              <div style={{ marginTop: 10, padding: "10px 12px", border: "0.5px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Invite code</div>
                <div style={{ fontWeight: 700, letterSpacing: 1 }}>{inviteCode}</div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-sm" onClick={() => void copyInviteCode()}>
                    Copy
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="tabs">
        <button className={`tab${activeTab === "venues" ? " active" : ""}`} onClick={() => setActiveTab("venues")}>
          Venues
        </button>
        <button className={`tab${activeTab === "vendors" ? " active" : ""}`} onClick={() => setActiveTab("vendors")}>
          Vendors
        </button>
        {isOwner ? (
          <button className={`tab${activeTab === "budget" ? " active" : ""}`} onClick={() => setActiveTab("budget")}>
            Budget
          </button>
        ) : null}
        <button className={`tab${activeTab === "guests" ? " active" : ""}`} onClick={() => setActiveTab("guests")}>
          Guests
        </button>
        <button className={`tab${activeTab === "tasks" ? " active" : ""}`} onClick={() => setActiveTab("tasks")}>
          Checklist
        </button>
        <button className={`tab${activeTab === "ai" ? " active" : ""}`} onClick={() => setActiveTab("ai")}>
          AI assistant
        </button>
      </div>

      {/* VENUES */}
      <div className={`section${activeTab === "venues" ? " active" : ""}`}>
        <div className="row">
          <div className="metric-card">
            <div className="metric-label">Venue options</div>
            <div className="metric-value">{venueMetrics.total}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Booked</div>
            <div className="metric-value">{venueMetrics.booked}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Researching</div>
            <div className="metric-value">{venueMetrics.researching}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Open research items</div>
            <div className="metric-value">{venueMetrics.researchOpen}</div>
          </div>
        </div>

        <div className="card card-full">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <span className="section-title" style={{ margin: 0 }}>
              Venue shortlist
            </span>
            <button className="btn btn-sm btn-primary" onClick={() => openVenueModal()}>
              + Add venue
            </button>
          </div>
          {venues.length === 0 ? (
            <div className="empty-state">No venues yet — start your shortlist.</div>
          ) : (
            venues.map((v) => (
              <div key={v.id} className="vendor-item">
                <div className="vendor-info">
                  <div className="vendor-name">{v.name}</div>
                  <div className="vendor-meta">
                    {v.location || "Location TBD"}
                    {v.est_price ? ` · ${v.est_price}` : ""}
                    {v.capacity ? ` · Capacity ${v.capacity}` : ""}
                  </div>
                  {(v.contact || v.website) ? (
                    <div className="vendor-meta">
                      {v.contact || "No contact yet"}
                      {v.website ? ` · ${v.website}` : ""}
                    </div>
                  ) : null}
                  {v.notes ? <div className="vendor-meta" style={{ fontStyle: "italic" }}>{v.notes}</div> : null}
                  {renderAddedBy(v.created_by)}
                </div>
                <div className="vendor-actions">
                  <span className={`badge badge-${v.status === "shortlisted" ? "contacted" : v.status === "touring" ? "researching" : v.status}`}>
                    {capitalize(v.status)}
                  </span>
                  <button className="btn btn-sm" onClick={() => openVenueModal(v)}>Edit</button>
                  <button className="btn btn-sm" onClick={() => void deleteVenue(v.id)} style={{ color: "#A32D2D" }}>Del</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card card-full" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <span className="section-title" style={{ margin: 0 }}>
              Venue research
            </span>
            <button className="btn btn-sm btn-primary" onClick={() => openVenueResearchModal()}>
              + Add research item
            </button>
          </div>
          {venueResearch.length === 0 ? (
            <div className="empty-state">No venue research yet.</div>
          ) : (
            venueResearch.map((r) => {
              const venueName = venues.find((v) => v.id === r.venue_id)?.name;
              return (
                <div key={r.id} className="vendor-item">
                  <div className="vendor-info">
                    <div className="vendor-name">{r.title}</div>
                    {venueName ? <div className="vendor-meta">Venue: {venueName}</div> : null}
                    {r.question ? <div className="vendor-meta">Q: {r.question}</div> : null}
                    {r.answer ? <div className="vendor-meta">A: {r.answer}</div> : null}
                    {r.source ? <div className="vendor-meta">Source: {r.source}</div> : null}
                    {renderAddedBy(r.created_by)}
                  </div>
                  <div className="vendor-actions">
                    <span className={`badge badge-${r.status === "open" ? "researching" : r.status === "answered" ? "booked" : "declined"}`}>
                      {capitalize(r.status)}
                    </span>
                    <button className="btn btn-sm" onClick={() => void deleteVenueResearch(r.id)} style={{ color: "#A32D2D" }}>
                      Del
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* VENDORS */}
      <div className={`section${activeTab === "vendors" ? " active" : ""}`}>
        <div className="row">
          <div className="metric-card">
            <div className="metric-label">Total vendors</div>
            <div className="metric-value">{vendorMetrics.total}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Booked</div>
            <div className="metric-value">{vendorMetrics.booked}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Researching</div>
            <div className="metric-value">{vendorMetrics.researching}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Contacted</div>
            <div className="metric-value">{vendorMetrics.contacted}</div>
          </div>
        </div>
        <div className="card card-full">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <span className="section-title" style={{ margin: 0 }}>
              Vendor research
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                style={{ width: 150, padding: "5px 8px", fontSize: 13 }}
              >
                <option value="">All categories</option>
                {VENUE_CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button className="btn btn-sm btn-primary" onClick={() => openVendorModal()}>
                + Add vendor
              </button>
            </div>
          </div>

          <div>
            {filteredVendors.length === 0 ? (
              <div className="empty-state">No vendors match this filter.</div>
            ) : (
              filteredVendors.map((v) => {
                const stars = ratingStars(v.rating);
                return (
                  <div key={v.id} className="vendor-item">
                    <div className="vendor-info">
                      <div className="vendor-name">{v.name}</div>
                      <div className="vendor-meta">
                        {v.cat}
                        {v.price ? " · " + v.price : ""}
                        {v.contact ? " · " + v.contact : ""}
                      </div>
                      {v.notes ? (
                        <div className="vendor-meta" style={{ fontStyle: "italic" }}>
                          {v.notes}
                        </div>
                      ) : null}
                      {stars ? <div className="stars">{stars}</div> : null}
                      {renderAddedBy(v.created_by)}
                    </div>
                    <div className="vendor-actions">
                      <span className={`badge badge-${v.status}`}>
                        {capitalize(v.status)}
                      </span>
                      <button className="btn btn-sm" onClick={() => openVendorModal(v)}>
                        Edit
                      </button>
                      <button className="btn btn-sm" onClick={() => void deleteVendor(v.id)} style={{ color: "#A32D2D" }}>
                        Del
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* BUDGET (owners only) */}
      {isOwner ? (
      <div className={`section${activeTab === "budget" ? " active" : ""}`}>
        <div className="row">
          <div className="metric-card">
            <div className="metric-label">Total budget</div>
            <div className="metric-value">${budgetMetrics.totalBudget.toLocaleString()}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Estimated spend</div>
            <div className="metric-value">${budgetMetrics.totalEst.toLocaleString()}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Actual spend</div>
            <div className="metric-value">${budgetMetrics.totalActual.toLocaleString()}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Remaining</div>
            <div className="metric-value">${budgetMetrics.remaining.toLocaleString()}</div>
          </div>
        </div>

        <div className="card card-full">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className="section-title" style={{ margin: 0 }}>
              Budget breakdown
            </span>
            <button className="btn btn-sm btn-primary" onClick={() => openBudgetModal()}>
              + Add category
            </button>
          </div>

          <div className="budget-row budget-header">
            <span>Category</span>
            <span>Estimated</span>
            <span>Actual</span>
            <span></span>
          </div>

          <div>
            {budgetCategories.length === 0 ? (
              <div className="empty-state">No budget categories yet.</div>
            ) : (
              budgetCategories.map((b) => {
                const pct = b.budget > 0 ? Math.min(100, Math.round((b.actual / b.budget) * 100)) : 0;
                const over = b.actual > b.budget;
                return (
                  <div key={b.id} className="budget-row">
                    <div>
                      <div>{b.name}</div>
                      {b.notes ? <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{b.notes}</div> : null}
                      {renderAddedBy(b.created_by)}
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: over ? "#E24B4A" : "#1D9E75",
                          }}
                        />
                      </div>
                    </div>
                    <div>${Number(b.est).toLocaleString()}</div>
                    <div style={{ color: over ? "#A32D2D" : "inherit" }}>${Number(b.actual).toLocaleString()}</div>
                    <div>
                      <button className="btn btn-sm" onClick={() => void deleteBudget(b.id)}>
                        Del
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      ) : null}

      {/* GUESTS */}
      <div className={`section${activeTab === "guests" ? " active" : ""}`}>
        <div className="row">
          <div className="metric-card">
            <div className="metric-label">Invited</div>
            <div className="metric-value">{guestMetrics.total}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Attending</div>
            <div className="metric-value">{guestMetrics.yes}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Declined</div>
            <div className="metric-value">{guestMetrics.no}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Awaiting RSVP</div>
            <div className="metric-value">{guestMetrics.pending}</div>
          </div>
        </div>

        <div className="card card-full">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="section-title" style={{ margin: 0 }}>
              Guest list
            </span>
            <button className="btn btn-sm btn-primary" onClick={() => openGuestModal()}>
              + Add guest
            </button>
          </div>

          <div className="guest-row guest-header">
            <span>Name</span>
            <span>Group</span>
            <span>RSVP</span>
            <span>Meal</span>
            <span></span>
          </div>

          <div>
            {guests.length === 0 ? (
              <div className="empty-state">No guests added yet.</div>
            ) : (
              guests.map((g) => (
                <div key={g.id} className="guest-row">
                  <div>
                    <div style={{ fontSize: 14 }}>{g.name}</div>
                    {g.notes ? <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{g.notes}</div> : null}
                    {renderAddedBy(g.created_by)}
                  </div>
                  <div style={{ color: "var(--color-text-secondary)" }}>{g.group_name || "—"}</div>
                  <div style={{ color: GUEST_RSVP_COLOR[g.rsvp] }}>{GUEST_RSVP_LABEL[g.rsvp]}</div>
                  <div style={{ color: "var(--color-text-secondary)" }}>{g.meal || "—"}</div>
                  <div>
                    <button className="btn btn-sm" onClick={() => void deleteGuest(g.id)} style={{ width: "auto" }}>
                      Del
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* TASKS */}
      <div className={`section${activeTab === "tasks" ? " active" : ""}`}>
        <div className="row">
          <div className="metric-card">
            <div className="metric-label">Total tasks</div>
            <div className="metric-value">{taskMetrics.total}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Completed</div>
            <div className="metric-value">{taskMetrics.done}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Remaining</div>
            <div className="metric-value">{taskMetrics.left}</div>
          </div>
        </div>

        <div className="card card-full">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
            <span className="section-title" style={{ margin: 0 }}>
              Planning checklist
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-sm" disabled={generatingTasks} onClick={() => void generateTasks()}>
                {generatingTasks ? <span className="spinner"></span> : "AI generate tasks ✦"}
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => openTaskModal()}>
                + Add task
              </button>
            </div>
          </div>

          <div>
            {tasks.length === 0 ? (
              <div className="empty-state">No tasks yet. Use &apos;AI generate tasks&apos; to create a full timeline!</div>
            ) : (
              TASK_WHEN_ORDER.map((w) => {
                const bucket = tasks.filter((t) => t.when_label === w);
                if (!bucket.length) return null;
                return (
                  <div key={w} style={{ margin: "14px 0 6px" }}>
                    <span className="tag-month">{w}</span>
                    {bucket.map((t) => (
                      <div key={t.id} className="task-item">
                        <div
                          className={`task-check${t.done ? " done" : ""}`}
                          onClick={() => void toggleTask(t.id)}
                          role="button"
                          aria-label={t.done ? "Mark task incomplete" : "Mark task complete"}
                        />
                        <div style={{ flex: 1 }}>
                          <div className={`task-title${t.done ? " done" : ""}`}>{t.task}</div>
                          <div className="task-when">{t.cat}</div>
                          {renderAddedBy(t.created_by)}
                        </div>
                        <button className="btn btn-sm" onClick={() => void deleteTask(t.id)} style={{ color: "var(--color-text-secondary)" }}>
                          Del
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* AI ASSISTANT */}
      <div className={`section${activeTab === "ai" ? " active" : ""}`}>
        <div className="card card-full">
          <div className="section-title">AI wedding assistant</div>
          <div className="ai-chat">
            <div className="ai-messages" id="ai-messages" ref={aiMessagesRef}>
              {aiMessages.map((m, idx) => (
                <div key={`${m.role}-${idx}`} className={`ai-msg ${m.role === "user" ? "user" : "assistant"}`}>
                  <AiMessageContent role={m.role} content={m.content} />
                </div>
              ))}
              {aiSending ? (
                <div className="ai-msg assistant ai-msg-loading" role="status" aria-live="polite" aria-busy="true">
                  <span className="spinner" aria-hidden />
                  <span>Thinking…</span>
                </div>
              ) : null}
            </div>

            <div className="quick-btns">
              <button
                type="button"
                className="quick-btn"
                disabled={aiSending}
                onClick={() => quickAsk("What questions should I ask a wedding venue?")}
              >
                Venue questions
              </button>
              <button
                type="button"
                className="quick-btn"
                disabled={aiSending}
                onClick={() => quickAsk("Give me a month-by-month wedding planning timeline")}
              >
                Planning timeline
              </button>
              {isOwner ? (
                <button
                  type="button"
                  className="quick-btn"
                  disabled={aiSending}
                  onClick={() => quickAsk("What is a realistic wedding budget breakdown?")}
                >
                  Budget guide
                </button>
              ) : null}
              <button
                type="button"
                className="quick-btn"
                disabled={aiSending}
                onClick={() => quickAsk("What should I look for in a wedding photographer?")}
              >
                Photographer tips
              </button>
              <button
                type="button"
                className="quick-btn"
                disabled={aiSending}
                onClick={() => quickAsk("Help me write questions to ask a caterer")}
              >
                Caterer questions
              </button>
            </div>

            <div className="ai-input-row">
              <input
                type="text"
                value={aiInput}
                placeholder={aiSending ? "Waiting for a reply…" : "Ask anything about wedding planning..."}
                disabled={aiSending}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !aiSending) void sendAI(aiInput);
                }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void sendAI(aiInput)}
                disabled={aiSending}
              >
                {aiSending ? (
                  <>
                    <span className="spinner" aria-hidden />
                    Sending…
                  </>
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VENUE MODAL */}
      <Modal
        open={venueModalOpen}
        title={editingVenueId ? "Edit venue" : "Add venue"}
        onClose={() => setVenueModalOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setVenueModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => void saveVenue()}>
              Save venue
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Venue name</label>
            <input value={venueForm.name} onChange={(e) => setVenueForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. The Grand Ballroom" />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={venueForm.status} onChange={(e) => setVenueForm((p) => ({ ...p, status: e.target.value as Venue["status"] }))}>
              {VENUE_STATUS.map((s) => (
                <option key={s} value={s}>{capitalize(s)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Location</label>
            <input value={venueForm.location} onChange={(e) => setVenueForm((p) => ({ ...p, location: e.target.value }))} placeholder="City, state" />
          </div>
          <div className="form-group">
            <label>Capacity</label>
            <input type="number" value={venueForm.capacity} onChange={(e) => setVenueForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="e.g. 150" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Estimated price</label>
            <input value={venueForm.est_price} onChange={(e) => setVenueForm((p) => ({ ...p, est_price: e.target.value }))} placeholder="e.g. $8,000" />
          </div>
          <div className="form-group">
            <label>Contact</label>
            <input value={venueForm.contact} onChange={(e) => setVenueForm((p) => ({ ...p, contact: e.target.value }))} placeholder="Email or phone" />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>Website</label>
          <input value={venueForm.website} onChange={(e) => setVenueForm((p) => ({ ...p, website: e.target.value }))} placeholder="https://..." />
        </div>
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>Notes</label>
          <textarea value={venueForm.notes} onChange={(e) => setVenueForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Tour notes, hidden fees, rain plan..." />
        </div>
      </Modal>

      {/* VENUE RESEARCH MODAL */}
      <Modal
        open={venueResearchModalOpen}
        title="Add venue research item"
        onClose={() => setVenueResearchModalOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setVenueResearchModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => void saveVenueResearch()}>
              Save item
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Title</label>
            <input value={venueResearchForm.title} onChange={(e) => setVenueResearchForm((p) => ({ ...p, title: e.target.value }))} placeholder="Parking & shuttle details" />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={venueResearchForm.status} onChange={(e) => setVenueResearchForm((p) => ({ ...p, status: e.target.value as VenueResearch["status"] }))}>
              {VENUE_RESEARCH_STATUS.map((s) => (
                <option key={s} value={s}>{capitalize(s)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>Venue (optional)</label>
          <select value={venueResearchForm.venue_id} onChange={(e) => setVenueResearchForm((p) => ({ ...p, venue_id: e.target.value }))}>
            <option value="">General / not linked</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>Question</label>
          <textarea value={venueResearchForm.question} onChange={(e) => setVenueResearchForm((p) => ({ ...p, question: e.target.value }))} placeholder="What exactly do we need to ask?" />
        </div>
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>Answer / findings</label>
          <textarea value={venueResearchForm.answer} onChange={(e) => setVenueResearchForm((p) => ({ ...p, answer: e.target.value }))} placeholder="What did we learn?" />
        </div>
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>Source</label>
          <input value={venueResearchForm.source} onChange={(e) => setVenueResearchForm((p) => ({ ...p, source: e.target.value }))} placeholder="Call, email, website, tour date..." />
        </div>
      </Modal>

      {/* VENDOR MODAL */}
      <Modal
        open={vendorModalOpen}
        title={editingVendorId ? "Edit vendor" : "Add vendor"}
        onClose={() => setVendorModalOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setVendorModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => void saveVendor()}>
              Save vendor
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Name</label>
            <input value={vendorForm.name} onChange={(e) => setVendorForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. The Grand Ballroom" />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={vendorForm.cat} onChange={(e) => setVendorForm((p) => ({ ...p, cat: e.target.value }))}>
              {VENUE_CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Contact / website</label>
            <input value={vendorForm.contact} onChange={(e) => setVendorForm((p) => ({ ...p, contact: e.target.value }))} placeholder="Email, phone, or URL" />
          </div>
          <div className="form-group">
            <label>Estimated price</label>
            <input value={vendorForm.price} onChange={(e) => setVendorForm((p) => ({ ...p, price: e.target.value }))} placeholder="e.g. $3,000" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select value={vendorForm.status} onChange={(e) => setVendorForm((p) => ({ ...p, status: e.target.value as Vendor["status"] }))}>
              {VENDOR_STATUS.map((s) => (
                <option key={s} value={s}>
                  {capitalize(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Rating (1–5)</label>
            <input
              value={vendorForm.rating}
              onChange={(e) => setVendorForm((p) => ({ ...p, rating: e.target.value }))}
              type="number"
              min={1}
              max={5}
              placeholder="e.g. 4"
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>Notes</label>
          <textarea value={vendorForm.notes} onChange={(e) => setVendorForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Anything to remember about this vendor..." />
        </div>
      </Modal>

      {/* BUDGET MODAL (owners only) */}
      {isOwner ? (
        <Modal
          open={budgetModalOpen}
          title="Add budget category"
          onClose={() => setBudgetModalOpen(false)}
          footer={
            <>
              <button className="btn" onClick={() => setBudgetModalOpen(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => void saveBudget()}>
                Save category
              </button>
            </>
          }
        >
          <div className="form-row">
            <div className="form-group">
              <label>Category name</label>
              <input value={budgetForm.name} onChange={(e) => setBudgetForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Venue" />
            </div>
            <div className="form-group">
              <label>Total budget ($)</label>
              <input value={budgetForm.budget} onChange={(e) => setBudgetForm((p) => ({ ...p, budget: e.target.value }))} type="number" placeholder="e.g. 5000" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Estimated cost ($)</label>
              <input value={budgetForm.est} onChange={(e) => setBudgetForm((p) => ({ ...p, est: e.target.value }))} type="number" placeholder="e.g. 4500" />
            </div>
            <div className="form-group">
              <label>Actual paid ($)</label>
              <input value={budgetForm.actual} onChange={(e) => setBudgetForm((p) => ({ ...p, actual: e.target.value }))} type="number" placeholder="e.g. 0" />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>Notes</label>
            <textarea value={budgetForm.notes} onChange={(e) => setBudgetForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Deposit due dates, vendor info..." />
          </div>
        </Modal>
      ) : null}

      {/* GUEST MODAL */}
      <Modal
        open={guestModalOpen}
        title="Add guest"
        onClose={() => setGuestModalOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setGuestModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => void saveGuest()}>
              Save guest
            </button>
          </>
        }
      >
        <div className="form-row">
          <div className="form-group">
            <label>Full name</label>
            <input value={guestForm.name} onChange={(e) => setGuestForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Jane Smith" />
          </div>
          <div className="form-group">
            <label>Group / side</label>
            <input value={guestForm.group_name} onChange={(e) => setGuestForm((p) => ({ ...p, group_name: e.target.value }))} placeholder="e.g. Bride's family" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>RSVP</label>
            <select value={guestForm.rsvp} onChange={(e) => setGuestForm((p) => ({ ...p, rsvp: e.target.value as Guest["rsvp"] }))}>
              <option value="pending">Pending</option>
              <option value="yes">Attending</option>
              <option value="no">Declined</option>
            </select>
          </div>
          <div className="form-group">
            <label>Meal choice</label>
            <select value={guestForm.meal} onChange={(e) => setGuestForm((p) => ({ ...p, meal: e.target.value }))}>
              <option value="">Not set</option>
              <option value="Chicken">Chicken</option>
              <option value="Fish">Fish</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Vegan">Vegan</option>
              <option value="Kids meal">Kids meal</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>Notes (dietary, plus-one, etc.)</label>
          <textarea value={guestForm.notes} onChange={(e) => setGuestForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Any special notes..." />
        </div>
      </Modal>

      {/* TASK MODAL */}
      <Modal
        open={taskModalOpen}
        title="Add task"
        onClose={() => setTaskModalOpen(false)}
        footer={
          <>
            <button className="btn" onClick={() => setTaskModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => void saveTask()}>
              Save task
            </button>
          </>
        }
      >
        <div className="form-group" style={{ marginBottom: 10 }}>
          <label>Task description</label>
          <input value={taskForm.task} onChange={(e) => setTaskForm((p) => ({ ...p, task: e.target.value }))} placeholder="e.g. Book wedding venue" />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>When (months out)</label>
            <select
              value={taskForm.when_label}
              onChange={(e) => setTaskForm((p) => ({ ...p, when_label: e.target.value as TaskWhenLabel }))}
            >
              {TASK_WHEN_ORDER.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select
              value={taskForm.cat}
              onChange={(e) => setTaskForm((p) => ({ ...p, cat: e.target.value as TaskCategory }))}
            >
              {TASK_CATS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

