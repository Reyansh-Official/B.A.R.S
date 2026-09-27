-- Hospitals directory, versioned assistance policies, and automated policy imports.

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
create policy "Admins can see their own row" on public.admins for select to authenticated using (user_id = (select auth.uid()));

create function public.is_admin() returns boolean
  language sql stable security definer set search_path = ''
  as $$ select exists (select 1 from public.admins where user_id = (select auth.uid())) $$;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- One row per institution that bills patients. `aliases` are the names that appear on bills.
create table public.hospitals (
  id text primary key,
  name text not null,
  aliases text[] not null default '{}',
  state text,
  website text,
  assistance_phone text,
  status text not null default 'pending' check (status in ('live', 'pending', 'failed')),
  created_at timestamptz not null default now()
);
alter table public.hospitals enable row level security;
create policy "Anyone can see live hospitals" on public.hospitals for select using (status = 'live');
create policy "Admins can see all hospitals" on public.hospitals for select to authenticated using ((select public.is_admin()));
create policy "Admins manage hospitals" on public.hospitals for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Every version of a hospital's policy is kept; exactly one can be approved at a time.
create table public.policies (
  id uuid primary key default gen_random_uuid(),
  hospital_id text not null references public.hospitals (id) on delete cascade,
  version int not null,
  status text not null check (status in ('draft', 'approved', 'superseded', 'rejected')),
  data jsonb not null,
  sources jsonb not null default '[]',
  validation jsonb not null default '{}',
  created_at timestamptz not null default now(),
  approved_by uuid references auth.users (id),
  approved_at timestamptz,
  unique (hospital_id, version)
);
create unique index policies_one_approved on public.policies (hospital_id) where status = 'approved';
alter table public.policies enable row level security;
create policy "Anyone can read approved policies" on public.policies for select using (status = 'approved');
create policy "Admins can read all policies" on public.policies for select to authenticated using ((select public.is_admin()));
create policy "Admins manage policies" on public.policies for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Automated import runs, created when a bill comes from an institution we don't have yet.
create table public.policy_imports (
  id uuid primary key default gen_random_uuid(),
  hospital_id text references public.hospitals (id) on delete cascade,
  query jsonb not null,
  status text not null check (status in ('queued', 'searching', 'extracting', 'validating', 'needs_review', 'failed', 'approved')),
  log jsonb not null default '[]',
  error text,
  policy_id uuid references public.policies (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index policy_imports_hospital on public.policy_imports (hospital_id, created_at desc);
alter table public.policy_imports enable row level security;
create policy "Admins read imports" on public.policy_imports for select to authenticated using ((select public.is_admin()));

-- Which policy version screened each application (audit trail).
alter table public.applications add column policy_id uuid references public.policies (id);
