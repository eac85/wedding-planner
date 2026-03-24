-- Track who created each wedding item + labels for collaborators

alter table public.vendors add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.budget_categories add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.guests add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.tasks add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.venues add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.venue_research add column if not exists created_by uuid references auth.users(id) on delete set null;

create index if not exists idx_vendors_created_by on public.vendors(created_by);
create index if not exists idx_budget_categories_created_by on public.budget_categories(created_by);
create index if not exists idx_guests_created_by on public.guests(created_by);
create index if not exists idx_tasks_created_by on public.tasks(created_by);
create index if not exists idx_venues_created_by on public.venues(created_by);
create index if not exists idx_venue_research_created_by on public.venue_research(created_by);

-- Readable labels for wedding members (caller must be a member of the wedding)
create or replace function public.wedding_member_labels(_wedding_id uuid)
returns table (user_id uuid, label text)
language sql
stable
security definer
set search_path = public
as $$
  select
    wm.user_id,
    coalesce(
      nullif(trim(au.raw_user_meta_data->>'full_name'), ''),
      nullif(trim(au.raw_user_meta_data->>'name'), ''),
      split_part(au.email, '@', 1)
    )::text as label
  from public.wedding_members wm
  join auth.users au on au.id = wm.user_id
  where wm.wedding_id = _wedding_id
    and public.is_wedding_member(_wedding_id);
$$;

grant execute on function public.wedding_member_labels(uuid) to authenticated;

-- Vendors: split policies so inserts must set created_by = auth.uid()
drop policy if exists "vendors_member_all" on public.vendors;
create policy "vendors_member_select"
on public.vendors
for select
using (public.is_wedding_member(wedding_id));

create policy "vendors_member_insert"
on public.vendors
for insert
to authenticated
with check (
  public.is_wedding_member(wedding_id)
  and created_by = auth.uid()
);

create policy "vendors_member_update"
on public.vendors
for update
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

create policy "vendors_member_delete"
on public.vendors
for delete
using (public.is_wedding_member(wedding_id));

-- Budget (owners only)
drop policy if exists "budget_categories_owner_all" on public.budget_categories;
create policy "budget_categories_owner_select"
on public.budget_categories
for select
using (public.is_wedding_owner(wedding_id));

create policy "budget_categories_owner_insert"
on public.budget_categories
for insert
to authenticated
with check (
  public.is_wedding_owner(wedding_id)
  and created_by = auth.uid()
);

create policy "budget_categories_owner_update"
on public.budget_categories
for update
using (public.is_wedding_owner(wedding_id))
with check (public.is_wedding_owner(wedding_id));

create policy "budget_categories_owner_delete"
on public.budget_categories
for delete
using (public.is_wedding_owner(wedding_id));

-- Guests
drop policy if exists "guests_member_all" on public.guests;
create policy "guests_member_select"
on public.guests
for select
using (public.is_wedding_member(wedding_id));

create policy "guests_member_insert"
on public.guests
for insert
to authenticated
with check (
  public.is_wedding_member(wedding_id)
  and created_by = auth.uid()
);

create policy "guests_member_update"
on public.guests
for update
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

create policy "guests_member_delete"
on public.guests
for delete
using (public.is_wedding_member(wedding_id));

-- Tasks
drop policy if exists "tasks_member_all" on public.tasks;
create policy "tasks_member_select"
on public.tasks
for select
using (public.is_wedding_member(wedding_id));

create policy "tasks_member_insert"
on public.tasks
for insert
to authenticated
with check (
  public.is_wedding_member(wedding_id)
  and created_by = auth.uid()
);

create policy "tasks_member_update"
on public.tasks
for update
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

create policy "tasks_member_delete"
on public.tasks
for delete
using (public.is_wedding_member(wedding_id));

-- Venues
drop policy if exists "venues_member_all" on public.venues;
create policy "venues_member_select"
on public.venues
for select
using (public.is_wedding_member(wedding_id));

create policy "venues_member_insert"
on public.venues
for insert
to authenticated
with check (
  public.is_wedding_member(wedding_id)
  and created_by = auth.uid()
);

create policy "venues_member_update"
on public.venues
for update
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

create policy "venues_member_delete"
on public.venues
for delete
using (public.is_wedding_member(wedding_id));

-- Venue research
drop policy if exists "venue_research_member_all" on public.venue_research;
create policy "venue_research_member_select"
on public.venue_research
for select
using (public.is_wedding_member(wedding_id));

create policy "venue_research_member_insert"
on public.venue_research
for insert
to authenticated
with check (
  public.is_wedding_member(wedding_id)
  and created_by = auth.uid()
);

create policy "venue_research_member_update"
on public.venue_research
for update
using (public.is_wedding_member(wedding_id))
with check (public.is_wedding_member(wedding_id));

create policy "venue_research_member_delete"
on public.venue_research
for delete
using (public.is_wedding_member(wedding_id));
