-- Wedding Planner schema (shared weddings + invites + AI chat)
-- Safe to re-run in Supabase SQL editor.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Wedding',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.wedding_members (
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  cat text not null,
  contact text not null default '',
  price text not null default '',
  status text not null default 'researching' check (status in ('researching', 'contacted', 'booked', 'declined')),
  rating int null check (rating between 1 and 5),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  budget numeric not null default 0,
  est numeric not null default 0,
  actual numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  group_name text not null default '',
  rsvp text not null default 'pending' check (rsvp in ('pending', 'yes', 'no')),
  meal text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  task text not null,
  when_label text not null,
  cat text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null,
  location text not null default '',
  capacity int null,
  est_price text not null default '',
  status text not null default 'researching' check (status in ('researching', 'touring', 'shortlisted', 'booked', 'declined')),
  contact text not null default '',
  website text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.venue_research (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  venue_id uuid null references public.venues(id) on delete cascade,
  title text not null,
  question text not null default '',
  answer text not null default '',
  source text not null default '',
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.wedding_invites (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_threads (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wedding_id, user_id)
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ai_threads(id) on delete cascade,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------

create index if not exists idx_wedding_members_user_id on public.wedding_members(user_id);
create index if not exists idx_vendors_wedding_id on public.vendors(wedding_id);
create index if not exists idx_budget_categories_wedding_id on public.budget_categories(wedding_id);
create index if not exists idx_guests_wedding_id on public.guests(wedding_id);
create index if not exists idx_tasks_wedding_id on public.tasks(wedding_id);
create index if not exists idx_venues_wedding_id on public.venues(wedding_id);
create index if not exists idx_venue_research_wedding_id on public.venue_research(wedding_id);
create index if not exists idx_venue_research_venue_id on public.venue_research(venue_id);
create index if not exists idx_wedding_invites_wedding_id on public.wedding_invites(wedding_id);
create index if not exists idx_wedding_invites_code on public.wedding_invites(code);
create index if not exists idx_ai_threads_wedding_id on public.ai_threads(wedding_id);
create index if not exists idx_ai_messages_thread_id on public.ai_messages(thread_id);
create index if not exists idx_ai_messages_wedding_id on public.ai_messages(wedding_id);

-- ------------------------------------------------------------
-- RLS helper functions
-- ------------------------------------------------------------

create or replace function public.is_wedding_member(_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wedding_members wm
    where wm.wedding_id = _wedding_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_wedding_owner(_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wedding_members wm
    where wm.wedding_id = _wedding_id
      and wm.user_id = auth.uid()
      and wm.role = 'owner'
  );
$$;

grant execute on function public.is_wedding_member(uuid) to authenticated, anon;
grant execute on function public.is_wedding_owner(uuid) to authenticated, anon;

-- ------------------------------------------------------------
-- Enable RLS
-- ------------------------------------------------------------

alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;
alter table public.vendors enable row level security;
alter table public.budget_categories enable row level security;
alter table public.guests enable row level security;
alter table public.tasks enable row level security;
alter table public.venues enable row level security;
alter table public.venue_research enable row level security;
alter table public.wedding_invites enable row level security;
alter table public.ai_threads enable row level security;
alter table public.ai_messages enable row level security;

-- ------------------------------------------------------------
-- Policies (drop + recreate for idempotency)
-- ------------------------------------------------------------

-- Weddings
drop policy if exists "weddings_select_member" on public.weddings;
drop policy if exists "weddings_insert_authenticated" on public.weddings;
drop policy if exists "weddings_update_owner" on public.weddings;
drop policy if exists "weddings_delete_owner" on public.weddings;

create policy "weddings_select_member"
on public.weddings
for select
using (public.is_wedding_member(id));

create policy "weddings_insert_authenticated"
on public.weddings
for insert
to authenticated
with check (created_by = auth.uid());

create policy "weddings_update_owner"
on public.weddings
for update
using (public.is_wedding_owner(id))
with check (public.is_wedding_owner(id));

create policy "weddings_delete_owner"
on public.weddings
for delete
using (public.is_wedding_owner(id));

-- Wedding members
drop policy if exists "wedding_members_select_member" on public.wedding_members;
drop policy if exists "wedding_members_insert_owner" on public.wedding_members;
drop policy if exists "wedding_members_update_owner" on public.wedding_members;
drop policy if exists "wedding_members_delete_owner_or_self" on public.wedding_members;

create policy "wedding_members_select_member"
on public.wedding_members
for select
using (public.is_wedding_member(wedding_id));

create policy "wedding_members_insert_owner"
on public.wedding_members
for insert
to authenticated
with check (public.is_wedding_owner(wedding_id));

create policy "wedding_members_update_owner"
on public.wedding_members
for update
using (public.is_wedding_owner(wedding_id))
with check (public.is_wedding_owner(wedding_id));

create policy "wedding_members_delete_owner_or_self"
on public.wedding_members
for delete
using (public.is_wedding_owner(wedding_id) or user_id = auth.uid());

-- Shared wedding data tables: all members can CRUD
drop policy if exists "vendors_member_all" on public.vendors;
create policy "vendors_member_all"
on public.vendors
for all
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

drop policy if exists "budget_categories_member_all" on public.budget_categories;
drop policy if exists "budget_categories_owner_all" on public.budget_categories;
create policy "budget_categories_owner_all"
on public.budget_categories
for all
using (public.is_wedding_owner(wedding_id))
with check (public.is_wedding_owner(wedding_id));

drop policy if exists "guests_member_all" on public.guests;
create policy "guests_member_all"
on public.guests
for all
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

drop policy if exists "tasks_member_all" on public.tasks;
create policy "tasks_member_all"
on public.tasks
for all
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

drop policy if exists "venues_member_all" on public.venues;
create policy "venues_member_all"
on public.venues
for all
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

drop policy if exists "venue_research_member_all" on public.venue_research;
create policy "venue_research_member_all"
on public.venue_research
for all
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

-- Invites (owner only)
drop policy if exists "wedding_invites_owner_select" on public.wedding_invites;
drop policy if exists "wedding_invites_owner_insert" on public.wedding_invites;
drop policy if exists "wedding_invites_owner_update" on public.wedding_invites;
drop policy if exists "wedding_invites_owner_delete" on public.wedding_invites;

create policy "wedding_invites_owner_select"
on public.wedding_invites
for select
using (public.is_wedding_owner(wedding_id));

create policy "wedding_invites_owner_insert"
on public.wedding_invites
for insert
to authenticated
with check (
  public.is_wedding_owner(wedding_id)
  and created_by = auth.uid()
);

create policy "wedding_invites_owner_update"
on public.wedding_invites
for update
using (public.is_wedding_owner(wedding_id))
with check (public.is_wedding_owner(wedding_id));

create policy "wedding_invites_owner_delete"
on public.wedding_invites
for delete
using (public.is_wedding_owner(wedding_id));

-- AI threads: one per wedding+user
drop policy if exists "ai_threads_select_own" on public.ai_threads;
drop policy if exists "ai_threads_insert_own" on public.ai_threads;
drop policy if exists "ai_threads_update_own" on public.ai_threads;
drop policy if exists "ai_threads_delete_own" on public.ai_threads;

create policy "ai_threads_select_own"
on public.ai_threads
for select
using (
  user_id = auth.uid()
  and public.is_wedding_member(wedding_id)
);

create policy "ai_threads_insert_own"
on public.ai_threads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_wedding_member(wedding_id)
);

create policy "ai_threads_update_own"
on public.ai_threads
for update
using (
  user_id = auth.uid()
  and public.is_wedding_member(wedding_id)
)
with check (
  user_id = auth.uid()
  and public.is_wedding_member(wedding_id)
);

create policy "ai_threads_delete_own"
on public.ai_threads
for delete
using (
  user_id = auth.uid()
  and public.is_wedding_member(wedding_id)
);

-- AI messages: user can only access their own messages, scoped to a wedding they belong to
drop policy if exists "ai_messages_select_own" on public.ai_messages;
drop policy if exists "ai_messages_insert_own" on public.ai_messages;
drop policy if exists "ai_messages_delete_own" on public.ai_messages;

create policy "ai_messages_select_own"
on public.ai_messages
for select
using (
  user_id = auth.uid()
  and public.is_wedding_member(wedding_id)
);

create policy "ai_messages_insert_own"
on public.ai_messages
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_wedding_member(wedding_id)
);

create policy "ai_messages_delete_own"
on public.ai_messages
for delete
using (
  user_id = auth.uid()
  and public.is_wedding_member(wedding_id)
);

