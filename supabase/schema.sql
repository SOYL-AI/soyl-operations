-- =============================================================
-- SOYL Operations Dashboard — Supabase schema
-- Run this in the Supabase SQL editor (one shot, idempotent-ish).
-- =============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ----- enums -----
-- IMPORTANT: if you are upgrading an existing project where the `role` enum
-- already exists WITHOUT 'super_admin', Postgres will not let you USE the new
-- value in the same transaction it was added in. Run ONLY this block first,
-- on its own, then run the rest of the file:
--
--   alter type role add value if not exists 'super_admin' before 'ceo';
--
-- After that single statement is committed, you can run the full schema.sql.
-- For a brand-new project the type is created with 'super_admin' included and
-- no separate step is needed.

do $$ begin
  create type role as enum ('super_admin','ceo','manager','employee','intern');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('todo','in_progress','review','done','blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_priority as enum ('low','medium','high','urgent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_status as enum ('planning','active','on_hold','completed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tx_type as enum ('revenue','expense');
exception when duplicate_object then null; end $$;

-- ----- profiles -----
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  title text,
  role role not null default 'employee',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Seeded super admin email. Set this ONCE per project:
--   alter database postgres set app.super_admin_email = 'ryangomez9965@gmail.com';
-- Anyone who signs up with this exact email is auto-promoted to 'super_admin'.
-- Everyone else lands as 'employee'. The DB is the source of truth — there is no
-- way to grant super_admin via the UI.
do $$ begin
  execute format('alter database %I set app.super_admin_email = %L',
    current_database(), 'ryangomez9965@gmail.com');
exception when others then null; end $$;

-- Auto-create profile on signup.
-- IMPORTANT: role is hard-coded. Never trust raw_user_meta_data->>'role'
-- because it is user-controllable from the signup form. Promote real managers/CEO
-- from the Team page after onboarding. The seeded super admin email is the only
-- way to bootstrap the first system administrator.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  seeded_admin text := current_setting('app.super_admin_email', true);
  assigned_role role := 'employee';
begin
  if seeded_admin is not null
     and length(seeded_admin) > 0
     and lower(new.email) = lower(seeded_admin) then
    assigned_role := 'super_admin';
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    assigned_role
  )
  on conflict (id) do update
    set role = case
      when public.profiles.role = 'super_admin' then public.profiles.role
      when assigned_role = 'super_admin' then 'super_admin'
      else public.profiles.role
    end;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- helper: current user's role
create or replace function public.current_role() returns role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('super_admin','ceo','manager') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;

-- ----- projects -----
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  status project_status not null default 'active',
  client_name text,
  owner_id uuid references public.profiles(id) on delete set null,
  budget numeric(14,2),
  start_date date,
  due_date date,
  progress int not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_owner on public.projects(owner_id);

-- ----- tasks -----
create table if not exists public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  project_id uuid references public.projects(id) on delete set null,
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  due_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_assignee on public.tasks(assignee_id);
create index if not exists idx_tasks_project on public.tasks(project_id);
create index if not exists idx_tasks_due on public.tasks(due_date);

-- maintain completed_at when task moves to done
create or replace function public.touch_task_completion()
returns trigger language plpgsql as $$
begin
  if (new.status = 'done' and (old is null or old.status <> 'done')) then
    new.completed_at = now();
  elsif (new.status <> 'done') then
    new.completed_at = null;
  end if;
  return new;
end; $$;

drop trigger if exists trg_task_completion on public.tasks;
create trigger trg_task_completion
  before insert or update on public.tasks
  for each row execute procedure public.touch_task_completion();

-- ----- task comments + updates -----
create table if not exists public.task_comments (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_task_comments_task on public.task_comments(task_id);

create table if not exists public.task_updates (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text,
  status_change task_status,
  created_at timestamptz not null default now()
);
create index if not exists idx_task_updates_task on public.task_updates(task_id);

-- ----- reviews -----
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  feedback text,
  period text not null, -- e.g. "2026-Q1" or "2026-04"
  created_at timestamptz not null default now()
);
create index if not exists idx_reviews_reviewee on public.reviews(reviewee_id);
do $$ begin
  alter table public.reviews add constraint reviews_reviewee_period_unique unique (reviewee_id, period);
exception when duplicate_object then null; when duplicate_table then null; end $$;

-- ----- transactions -----
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  type tx_type not null,
  category text,
  amount numeric(14,2) not null,
  currency text not null default 'INR',
  project_id uuid references public.projects(id) on delete set null,
  description text,
  occurred_on date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_tx_type_date on public.transactions(type, occurred_on);
create index if not exists idx_tx_project on public.transactions(project_id);

-- ----- activity log -----
create table if not exists public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_recent on public.activity_log(created_at desc);

-- ----- notifications -----
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, read, created_at desc);

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles      enable row level security;
alter table public.projects      enable row level security;
alter table public.tasks         enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_updates  enable row level security;
alter table public.reviews       enable row level security;
alter table public.transactions  enable row level security;
alter table public.activity_log  enable row level security;
alter table public.notifications enable row level security;

-- profiles: everyone authenticated can read all profiles (team directory).
-- Each user can update their own profile; managers/ceo can update any.
drop policy if exists "profiles_read_all"    on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_mgr"  on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;

create policy "profiles_read_all" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles_update_mgr" on public.profiles
  for update to authenticated using (public.is_manager()) with check (public.is_manager());

-- projects: read-all (authenticated), write by managers/ceo
drop policy if exists "projects_read"  on public.projects;
drop policy if exists "projects_write" on public.projects;
create policy "projects_read"  on public.projects for select to authenticated using (true);
create policy "projects_write" on public.projects for all    to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- tasks: read-all; insert/update by manager OR by assignee on their own task
drop policy if exists "tasks_read"      on public.tasks;
drop policy if exists "tasks_insert"    on public.tasks;
drop policy if exists "tasks_update"    on public.tasks;
drop policy if exists "tasks_delete"    on public.tasks;

create policy "tasks_read" on public.tasks for select to authenticated using (true);

create policy "tasks_insert" on public.tasks for insert to authenticated
  with check (public.is_manager() or created_by = auth.uid());

create policy "tasks_update" on public.tasks for update to authenticated
  using (public.is_manager() or assignee_id = auth.uid())
  with check (public.is_manager() or assignee_id = auth.uid());

create policy "tasks_delete" on public.tasks for delete to authenticated
  using (public.is_manager());

-- comments + updates: read-all, write by self
drop policy if exists "comments_read"   on public.task_comments;
drop policy if exists "comments_write"  on public.task_comments;
create policy "comments_read"  on public.task_comments for select to authenticated using (true);
create policy "comments_write" on public.task_comments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "updates_read"  on public.task_updates;
drop policy if exists "updates_write" on public.task_updates;
create policy "updates_read"  on public.task_updates for select to authenticated using (true);
create policy "updates_write" on public.task_updates for insert to authenticated
  with check (user_id = auth.uid());

-- reviews: reviewees can read their own; managers and super_admin can read/write all.
-- (is_manager() includes super_admin.)
drop policy if exists "reviews_read"  on public.reviews;
drop policy if exists "reviews_write" on public.reviews;
create policy "reviews_read" on public.reviews for select to authenticated
  using (reviewee_id = auth.uid() or public.is_manager());
create policy "reviews_write" on public.reviews for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- transactions: only managers/ceo can read or write
drop policy if exists "tx_read"  on public.transactions;
drop policy if exists "tx_write" on public.transactions;
create policy "tx_read"  on public.transactions for select to authenticated using (public.is_manager());
create policy "tx_write" on public.transactions for all    to authenticated
  using (public.is_manager()) with check (public.is_manager());

-- activity log: read-all, insert only as yourself (no null-actor system spoofing)
drop policy if exists "activity_read"  on public.activity_log;
drop policy if exists "activity_write" on public.activity_log;
create policy "activity_read"  on public.activity_log for select to authenticated using (true);
create policy "activity_write" on public.activity_log for insert to authenticated
  with check (actor_id = auth.uid());

-- notifications: per user. Direct INSERTs are managers-only or self; the
-- application creates cross-user notifications via the notify() SECURITY DEFINER
-- function below, which enforces its own rules.
drop policy if exists "notif_read"   on public.notifications;
drop policy if exists "notif_update" on public.notifications;
drop policy if exists "notif_insert" on public.notifications;
create policy "notif_read"   on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif_update" on public.notifications for update to authenticated using (user_id = auth.uid());
create policy "notif_insert" on public.notifications for insert to authenticated
  with check (user_id = auth.uid() or public.is_manager());

-- notify() — call from server actions to send a notification to another user.
-- Bypasses RLS but rejects calls from unauthenticated callers and self-empty payloads.
create or replace function public.notify(
  target_id uuid, ntitle text, nbody text default null, nlink text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'notify(): unauthenticated';
  end if;
  if target_id is null or ntitle is null then
    raise exception 'notify(): missing target or title';
  end if;
  -- never spam yourself
  if target_id = auth.uid() then
    return;
  end if;
  insert into public.notifications (user_id, title, body, link)
  values (target_id, ntitle, nbody, nlink);
end; $$;

revoke all on function public.notify(uuid, text, text, text) from public;
grant execute on function public.notify(uuid, text, text, text) to authenticated;

-- =============================================================
-- Realtime publications (optional but useful)
-- =============================================================
do $$ begin
  perform 1 from pg_publication where pubname = 'supabase_realtime';
  if found then
    alter publication supabase_realtime add table public.tasks;
    alter publication supabase_realtime add table public.task_comments;
    alter publication supabase_realtime add table public.activity_log;
    alter publication supabase_realtime add table public.notifications;
  end if;
exception when duplicate_object then null; end $$;
