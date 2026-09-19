-- Phase 2: Supabase backend for live agent tracking.
-- Run this once in the Supabase SQL editor (or via `supabase db push`) on a
-- fresh project. See C:\Users\user\.claude\plans\sorted-growing-waterfall.md
-- for the full design rationale.

-- =========================================================
-- 1. TEAMS
-- =========================================================
create table public.teams (
  id         text primary key,                 -- client-minted via uid('t_')
  name       text not null,
  city       text not null,
  city_tier  text not null check (city_tier in ('tier1','tier2','tier3')),
  lat        double precision not null,
  lng        double precision not null,
  radius_km  numeric not null default 12,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 2. PROFILES  (1:1 with auth.users; source of truth for role/team for RLS)
-- =========================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  username   text not null unique,              -- lowercase, matches login form input
  role       text not null check (role in ('super_admin','admin','team_lead','field_agent','client')),
  team_id    text references public.teams(id),
  phone      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);
create index profiles_team_id_idx on public.profiles(team_id);

-- =========================================================
-- 3. MERCHANTS
-- =========================================================
create table public.merchants (
  id               text primary key,            -- uid('m_')
  name             text not null,
  address          text not null default '',
  phone            text not null default '',
  owner_name       text,
  category         text,
  city_tier        text not null check (city_tier in ('tier1','tier2','tier3')),
  lat              double precision,
  lng              double precision,
  status           text not null check (status in ('cold_start','registered','activated')) default 'cold_start',
  cold_start_done  boolean not null default false,
  assigned_to      uuid references public.profiles(id),
  team_id          text references public.teams(id),
  source           text not null check (source in ('imported','manual')),
  archived         boolean not null default false,   -- parity fix vs scopeUsers' `active` filter, see RLS section
  created_at       timestamptz not null default now()
);
create index merchants_team_id_idx on public.merchants(team_id);
create index merchants_assigned_to_idx on public.merchants(assigned_to);

-- =========================================================
-- 4. VISITS
-- =========================================================
create table public.visits (
  id                  text primary key,          -- uid('v_')
  merchant_id         text not null references public.merchants(id),
  agent_id            uuid not null references public.profiles(id),
  check_in_at         timestamptz not null default now(),
  check_out_at        timestamptz,
  lat                 double precision not null,
  lng                 double precision not null,
  merchant_distance_m numeric,
  geo_valid           boolean not null,
  owner_name          text not null default '',
  contact_phone       text not null default '',
  notes               text not null default '',
  result              text not null check (result in
                        ('pitch','follow_up_wa','registered','qualification_passed',
                         'product_uploaded','redemption','cold_start_complete')),
  photos              text[] not null default '{}',   -- local file:// URIs today, no Storage sync yet (phase 3)
  docs                jsonb not null default '[]',    -- [{name, uri}]
  created_at          timestamptz not null default now()
);
create index visits_agent_id_idx on public.visits(agent_id);
create index visits_merchant_id_idx on public.visits(merchant_id);

-- =========================================================
-- 5. ATTENDANCES  (route lives in route_points, not a JSONB column here)
-- =========================================================
create table public.attendances (
  id             text primary key,              -- uid('a_')
  user_id        uuid not null references public.profiles(id),
  clock_in_at    timestamptz not null default now(),
  clock_in_lat   double precision not null,
  clock_in_lng   double precision not null,
  clock_out_at   timestamptz,
  clock_out_lat  double precision,
  clock_out_lng  double precision,
  geo_fence_ok   boolean not null,
  created_at     timestamptz not null default now()
);
create index attendances_user_id_idx on public.attendances(user_id);
create index attendances_open_idx on public.attendances(user_id) where clock_out_at is null;
alter table public.attendances replica identity full;   -- so UPDATE (clock-out) realtime payload carries full row

-- =========================================================
-- 6. ROUTE_POINTS  (one row per GPS ping - realtime-friendly, see plan §Schema)
-- =========================================================
create table public.route_points (
  id            bigint generated always as identity primary key,
  attendance_id text not null references public.attendances(id) on delete cascade,
  user_id       uuid not null references public.profiles(id),   -- denormalized, avoids join in RLS hot path
  lat           double precision not null,
  lng           double precision not null,
  recorded_at   timestamptz not null default now()
);
create index route_points_attendance_idx on public.route_points(attendance_id, recorded_at);
create index route_points_user_recent_idx on public.route_points(user_id, recorded_at desc);

-- =========================================================
-- 7. Helper functions (avoid RLS self-recursion on profiles)
-- =========================================================
create or replace function public.current_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_team_id() returns text
language sql stable security definer set search_path = public as $$
  select team_id from public.profiles where id = auth.uid()
$$;

-- =========================================================
-- 8. RLS policies
-- =========================================================
alter table public.profiles enable row level security;

create policy profiles_select on public.profiles for select
using (
  id = auth.uid()
  or public.current_role() in ('super_admin','admin','client')
  or (public.current_role() = 'team_lead' and active and team_id = public.current_team_id())
);
-- field_agent: neither branch fires beyond "id = auth.uid()" -> self only. Matches scopeUsers() exactly.
-- super_admin/admin/client must see inactive profiles too, not just active ones: Postgres RLS
-- for UPDATE...RETURNING (which PostgREST always uses under the hood) requires the SELECT
-- policy to hold for the resulting row, not just the UPDATE policy's own WITH CHECK. Gating
-- this branch on `active` meant toggleUserActive() could never work at all: deactivating a
-- user made the RETURNING row invisible (explicit RLS error), and reactivating one failed
-- silently because the already-inactive row wasn't targetable in the first place.

create policy profiles_write_super_admin on public.profiles for update
using (public.current_role() = 'super_admin')
with check (public.current_role() = 'super_admin');
-- No client-side INSERT policy: new profile rows are only ever created by the
-- handle_new_auth_user trigger below (security definer, bypasses RLS).

alter table public.teams enable row level security;

create policy teams_select on public.teams for select using (true);   -- any authenticated role
create policy teams_write on public.teams for all
using (public.current_role() = 'super_admin')
with check (public.current_role() = 'super_admin');

alter table public.merchants enable row level security;

create policy merchants_select on public.merchants for select
using (
  ( not archived and public.current_role() in ('super_admin','admin','client') )
  or ( not archived and public.current_role() = 'team_lead' and team_id = public.current_team_id() )
  or ( not archived and public.current_role() = 'field_agent' and assigned_to = auth.uid() )
);

create policy merchants_insert on public.merchants for insert
with check (
  public.current_role() in ('super_admin','admin')
  or (public.current_role() = 'team_lead' and (team_id = public.current_team_id() or team_id is null))
  or (public.current_role() = 'field_agent' and assigned_to = auth.uid())   -- self-registered cold-start merchant
);

create policy merchants_update on public.merchants for update
using (
  public.current_role() in ('super_admin','admin')
  or (public.current_role() = 'team_lead' and team_id = public.current_team_id())
)
with check (
  public.current_role() in ('super_admin','admin')
  or (public.current_role() = 'team_lead' and team_id = public.current_team_id())
);
-- Deliberately NO field_agent update policy: a field agent's only legitimate
-- mutation of a merchant's status/cold_start_done happens via finish_visit() below.

alter table public.visits enable row level security;

create policy visits_select on public.visits for select
using (
  public.current_role() in ('super_admin','admin','client')
  or (public.current_role() = 'team_lead'
      and agent_id in (select id from public.profiles where team_id = public.current_team_id()))
  or agent_id = auth.uid()
);

create policy visits_write_own on public.visits for all
using (agent_id = auth.uid())
with check (agent_id = auth.uid());

alter table public.attendances enable row level security;

create policy attendances_select on public.attendances for select
using (
  public.current_role() in ('super_admin','admin','client')
  or (public.current_role() = 'team_lead'
      and user_id in (select id from public.profiles where team_id = public.current_team_id()))
  or user_id = auth.uid()
);

create policy attendances_insert_own on public.attendances for insert
with check (user_id = auth.uid());

create policy attendances_update_own on public.attendances for update
using (user_id = auth.uid() and clock_out_at is null)
with check (user_id = auth.uid());

alter table public.route_points enable row level security;

create policy route_points_select on public.route_points for select
using (
  public.current_role() in ('super_admin','admin','client')
  or (public.current_role() = 'team_lead'
      and user_id in (select id from public.profiles where team_id = public.current_team_id()))
  or user_id = auth.uid()
);

create policy route_points_insert_own on public.route_points for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.attendances a
    where a.id = attendance_id and a.user_id = auth.uid() and a.clock_out_at is null
  )
);
-- No update/delete policy -> immutable ping log by default-deny.

-- =========================================================
-- 9. finish_visit RPC - mirrors applyResult() from src/store/useStore.ts,
--    lets a field agent close a visit + update the merchant funnel status
--    without needing a direct UPDATE grant on merchants.
-- =========================================================
create or replace function public.finish_visit(p_visit_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v record;
begin
  select * into v from public.visits where id = p_visit_id and agent_id = auth.uid();
  if not found then
    raise exception 'visit not found or not owned by caller';
  end if;

  update public.visits set check_out_at = now() where id = p_visit_id;

  update public.merchants set
    status = case
      when v.result in ('registered','qualification_passed','product_uploaded') then 'registered'
      when v.result in ('redemption','cold_start_complete') then 'activated'
      else status
    end,
    cold_start_done = case when v.result = 'cold_start_complete' then true else cold_start_done end
  where id = v.merchant_id;
end;
$$;

grant execute on function public.finish_visit(text) to authenticated;

-- =========================================================
-- 10. auth.users -> profiles provisioning trigger
--     (only creation path: admin-provisioned via scripts/seed-supabase.ts
--      or supabase/functions/admin-users - never public signUp())
-- =========================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, username, role, team_id, phone, active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'username'),
    new.raw_user_meta_data->>'username',
    coalesce(new.raw_user_meta_data->>'role', 'field_agent'),
    new.raw_user_meta_data->>'team_id',
    new.raw_user_meta_data->>'phone',
    true
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =========================================================
-- 11. Realtime: publish the tables live-tracking viewers need to subscribe to
-- =========================================================
alter publication supabase_realtime add table
  public.profiles, public.teams, public.merchants, public.visits,
  public.attendances, public.route_points;
