-- Run once in Supabase Dashboard -> SQL Editor.
-- Linh Thu's notes are intentionally stored separately from the main gallery.

create table if not exists public.guestbook_linhthu (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  message text not null check (char_length(btrim(message)) between 1 and 500),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.guestbook_linhthu enable row level security;

revoke all on table public.guestbook_linhthu from anon, authenticated;
grant insert on table public.guestbook_linhthu to anon, authenticated;
grant select, update, delete on table public.guestbook_linhthu to authenticated;
grant usage, select on sequence public.guestbook_linhthu_id_seq to anon, authenticated;

drop policy if exists "linhthu_guest_can_sign" on public.guestbook_linhthu;
create policy "linhthu_guest_can_sign"
  on public.guestbook_linhthu
  for insert
  to anon, authenticated
  with check (
    char_length(btrim(name)) between 1 and 40
    and char_length(btrim(message)) between 1 and 500
    and hidden = false
  );

drop policy if exists "linhthu_admin_can_read" on public.guestbook_linhthu;
create policy "linhthu_admin_can_read"
  on public.guestbook_linhthu
  for select
  to authenticated
  using (true);

drop policy if exists "linhthu_admin_can_update" on public.guestbook_linhthu;
create policy "linhthu_admin_can_update"
  on public.guestbook_linhthu
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "linhthu_admin_can_delete" on public.guestbook_linhthu;
create policy "linhthu_admin_can_delete"
  on public.guestbook_linhthu
  for delete
  to authenticated
  using (true);

-- This view deliberately omits the guest's name. It is owned by the SQL
-- migration role and exposes only visible messages to anonymous visitors.
create or replace view public.guestbook_linhthu_public as
  select id, message, created_at
  from public.guestbook_linhthu
  where hidden = false;

revoke all on table public.guestbook_linhthu_public from public, anon, authenticated;
grant select on table public.guestbook_linhthu_public to anon, authenticated;
