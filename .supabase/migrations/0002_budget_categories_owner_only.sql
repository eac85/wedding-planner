-- Budget: owners only (run if you already applied 0001 with member-wide budget access)

drop policy if exists "budget_categories_member_all" on public.budget_categories;

drop policy if exists "budget_categories_owner_all" on public.budget_categories;
create policy "budget_categories_owner_all"
on public.budget_categories
for all
using (public.is_wedding_owner(wedding_id))
with check (public.is_wedding_owner(wedding_id));
