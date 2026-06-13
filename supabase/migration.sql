-- USERS (seeded manually by admin — no signup, no OTP)
create table users (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text unique not null,
  role            text not null default 'family',
  language        text not null default 'en',
  login_token     uuid not null default gen_random_uuid(),
  pending_options jsonb
);

-- FUNCTIONS (optional grouping: Haldi, Sangeet, ...)
create table functions (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  date date
);

-- TASKS
create table tasks (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,
  function_id uuid references functions(id),
  title       text not null,
  description text,
  assigned_to uuid references users(id),
  due_date    date,
  status      text not null default 'todo',
  priority    text not null default 'normal',
  created_by  uuid references users(id),
  created_at  timestamptz not null default now()
);

-- COMMENTS / ACTIVITY
create table comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid references tasks(id) on delete cascade,
  user_id    uuid references users(id),
  text       text,
  voice_url  text,
  created_at timestamptz not null default now()
);

-- ATTACHMENTS
create table attachments (
  id       uuid primary key default gen_random_uuid(),
  task_id  uuid references tasks(id) on delete cascade,
  file_url text,
  type     text
);

-- BOT DEBUG LOG
create table inbound_messages (
  id          uuid primary key default gen_random_uuid(),
  message_id  text unique,                        -- Meta msg.id, used for deduplication on retries
  from_phone  text,
  raw_text    text,
  parsed_json jsonb,
  result      text,
  created_at  timestamptz not null default now()
);

-- BUDGET (optional)
create table budget_items (
  id          uuid primary key default gen_random_uuid(),
  function_id uuid references functions(id),
  title       text,
  amount      numeric,
  paid        boolean not null default false,
  vendor      text
);

-- ROW LEVEL SECURITY
alter table users    enable row level security;
alter table tasks    enable row level security;
alter table comments enable row level security;

create policy "anon read tasks"     on tasks    for select to anon using (true);
create policy "anon write tasks"    on tasks    for all    to anon using (true) with check (true);
create policy "anon read comments"  on comments for select to anon using (true);
create policy "anon write comments" on comments for all    to anon using (true) with check (true);
create policy "anon read users"     on users    for select to anon using (true);
