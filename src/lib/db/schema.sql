-- ============================================================
-- Job Agent — Supabase PostgreSQL Schema
-- ============================================================

-- ── Trigger function: auto-update updated_at ─────────────────

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ============================================================
-- 1. base_resumes
-- ============================================================

create table public.base_resumes (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  data        jsonb       not null,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table public.base_resumes enable row level security;

create policy "Authenticated users full access on base_resumes"
  on public.base_resumes
  for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 2. jobs
-- ============================================================

create table public.jobs (
  id                  uuid        primary key default gen_random_uuid(),
  title               text        not null,
  company             text        not null,
  location            text,
  url                 text        unique not null,
  source              text        not null,
  jd_text             text,
  jd_hash             text        unique,
  required_skills     text[]      not null default '{}',
  nice_to_have_skills text[]      not null default '{}',
  experience_years    int,
  role_level          text        not null default 'unknown',
  ats_score           int,
  status              text        not null default 'pending',
  scraped_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Indexes
create index idx_jobs_status     on public.jobs (status);
create index idx_jobs_source     on public.jobs (source);
create index idx_jobs_ats_score  on public.jobs (ats_score);
create index idx_jobs_scraped_at on public.jobs (scraped_at desc);

-- Auto-update updated_at
create trigger set_jobs_updated_at
  before update on public.jobs
  for each row
  execute function public.handle_updated_at();

alter table public.jobs enable row level security;

create policy "Authenticated users full access on jobs"
  on public.jobs
  for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 3. tailored_resumes
-- ============================================================

create table public.tailored_resumes (
  id                uuid        primary key default gen_random_uuid(),
  job_id            uuid        not null references public.jobs(id) on delete cascade,
  base_resume_id    uuid        not null references public.base_resumes(id),
  tailored_bullets  jsonb,
  tailored_summary  text,
  ats_score         int,
  missing_keywords  text[]      not null default '{}',
  covered_keywords  text[]      not null default '{}',
  pdf_path          text,
  created_at        timestamptz not null default now()
);

alter table public.tailored_resumes enable row level security;

create policy "Authenticated users full access on tailored_resumes"
  on public.tailored_resumes
  for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 4. applications
-- ============================================================

create table public.applications (
  id                  uuid        primary key default gen_random_uuid(),
  job_id              uuid        not null references public.jobs(id) on delete cascade,
  tailored_resume_id  uuid        references public.tailored_resumes(id),
  cover_letter        text,
  applied_at          timestamptz,
  response_status     text        not null default 'applied',
  notes               text,
  created_at          timestamptz not null default now()
);

alter table public.applications enable row level security;

create policy "Authenticated users full access on applications"
  on public.applications
  for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 5. scrape_logs
-- ============================================================

create table public.scrape_logs (
  id         uuid        primary key default gen_random_uuid(),
  source     text,
  jobs_found int         not null default 0,
  jobs_new   int         not null default 0,
  errors     jsonb       not null default '[]'::jsonb,
  ran_at     timestamptz not null default now()
);

alter table public.scrape_logs enable row level security;

create policy "Authenticated users full access on scrape_logs"
  on public.scrape_logs
  for all
  to authenticated
  using (true)
  with check (true);
