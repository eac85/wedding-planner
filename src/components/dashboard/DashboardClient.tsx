"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Wedding = {
  id: string;
  name: string;
  createdAt: string;
};

export default function DashboardClient({ weddings }: { weddings: Wedding[] }) {
  const [newWeddingName, setNewWeddingName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState<null | string>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const weddingsSorted = useMemo(() => {
    return [...weddings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [weddings]);

  async function createWedding() {
    setLoading("creating");
    setErrorMsg(null);
    try {
      const name = newWeddingName.trim() || "My Wedding";
      const res = await fetch("/api/weddings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create wedding");
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create wedding";
      setErrorMsg(message);
    } finally {
      setLoading(null);
    }
  }

  async function joinWedding() {
    setLoading("joining");
    setErrorMsg(null);
    try {
      const code = inviteCode.trim();
      if (!code) return;
      const res = await fetch("/api/weddings/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to join wedding");
      window.location.href = "/";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to join wedding";
      setErrorMsg(message);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="app">
      <div className="header">
        <h1>Wedding planner</h1>
        <p>Plan the perfect day, together</p>
      </div>

      <div className="row" style={{ alignItems: "stretch" }}>
        <div className="card" style={{ flex: "1 1 340px" }}>
          <div className="section-title" style={{ marginBottom: 10 }}>
            Your weddings
          </div>

          {weddingsSorted.length === 0 ? (
            <div className="empty-state">No shared weddings yet.</div>
          ) : (
            <div>
              {weddingsSorted.map((w) => (
                <div key={w.id} style={{ padding: "10px 0", borderBottom: "0.5px solid var(--color-border)" }}>
                  <Link href={`/w/${w.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 600 }}>{w.name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>Open</div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ flex: "0 1 280px" }}>
          <div className="section-title" style={{ marginBottom: 8 }}>
            Create & share
          </div>

          {errorMsg ? (
            <div
              style={{
                marginBottom: 10,
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                border: "0.5px solid #D88787",
                background: "#FCEBEB",
                color: "#A32D2D",
                fontSize: 12,
              }}
            >
              {errorMsg}
            </div>
          ) : null}

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label>Wedding name</label>
            <input
              value={newWeddingName}
              onChange={(e) => setNewWeddingName(e.target.value)}
              placeholder="e.g. Emery + Grace"
            />
          </div>

          <button className="btn btn-primary" onClick={createWedding} disabled={loading === "creating"} style={{ width: "100%" }}>
            {loading === "creating" ? "Creating..." : "+ Create wedding"}
          </button>

          <div style={{ height: 14 }} />

          <div className="form-group" style={{ marginBottom: 8 }}>
            <label>Invite code</label>
            <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Paste code from owner" />
          </div>

          <button className="btn" onClick={joinWedding} disabled={loading === "joining"} style={{ width: "100%" }}>
            {loading === "joining" ? "Joining..." : "Join with code"}
          </button>
        </div>
      </div>
    </div>
  );
}

