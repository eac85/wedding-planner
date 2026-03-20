import { supabaseServer } from "@/lib/supabase/serverClient";
import AuthCard from "@/components/auth/AuthCard";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function Home() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="app">
        <div className="header">
          <h1>With Grace</h1>
          <p>Plan the perfect day, together</p>
        </div>
        <AuthCard />
      </div>
    );
  }

  const { data: weddings } = await supabase
    .from("weddings")
    .select("id,name,created_at")
    .order("created_at", { ascending: false });

  return (
    <DashboardClient
      weddings={(weddings ?? []).map((w) => ({
        id: w.id,
        name: w.name,
        createdAt: w.created_at,
      }))}
    />
  );
}
