-- =============================================
-- مسار العقار — Database Schema
-- app.masaralaqar.com
-- =============================================

-- Offices: كل مكتب عقاري = tenant منفصل
create table offices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text default 'trial',
  whatsapp_token text,
  whatsapp_phone_id text,
  ai_prompt text,
  created_at timestamptz default now()
);

-- Users: موظفو المكتب
create table users (
  id uuid primary key references auth.users(id),
  office_id uuid references offices(id),
  name text,
  email text,
  role text default 'agent' check (role in ('admin', 'agent')),
  created_at timestamptz default now()
);

-- Leads: العملاء المحتملون
create table leads (
  id uuid primary key default gen_random_uuid(),
  office_id uuid references offices(id),
  name text,
  phone text,
  source text default 'whatsapp',
  budget numeric,
  property_type text,
  location text,
  stage text default 'new' check (stage in ('new', 'contacted', 'qualified', 'viewing', 'closed')),
  score integer default 0,
  assigned_to uuid references users(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(office_id, phone)
);

-- Messages: سجل المحادثات
create table messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  direction text check (direction in ('incoming', 'outgoing')),
  content text,
  raw_payload jsonb,
  created_at timestamptz default now()
);

-- Activities: سجل النشاطات
create table activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  type text check (type in ('call', 'meeting', 'note', 'whatsapp')),
  description text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- Office Settings: إعدادات كل مكتب
create table office_settings (
  id uuid primary key default gen_random_uuid(),
  office_id uuid references offices(id) unique,
  assignment_rules jsonb default '{}',
  scoring_rules jsonb default '{}',
  created_at timestamptz default now()
);

-- =============================================
-- RLS Policies
-- =============================================

alter table offices enable row level security;
alter table users enable row level security;
alter table leads enable row level security;
alter table messages enable row level security;
alter table activities enable row level security;

-- Offices: يرى المستخدم مكتبه فقط
create policy "users_see_own_office" on offices
  for select using (id = (select office_id from users where id = auth.uid()));

create policy "users_update_own_office" on offices
  for update using (id = (select office_id from users where id = auth.uid()));

-- Users: يرى موظفي مكتبه فقط
create policy "office_isolation_users" on users
  for select using (office_id = (select office_id from users where id = auth.uid()));

-- Leads: عزل كامل بالـ office_id
create policy "office_isolation_leads_select" on leads
  for select using (office_id = (select office_id from users where id = auth.uid()));

create policy "office_isolation_leads_insert" on leads
  for insert with check (office_id = (select office_id from users where id = auth.uid()));

create policy "office_isolation_leads_update" on leads
  for update using (office_id = (select office_id from users where id = auth.uid()));

-- Messages: عبر الـ leads
create policy "office_isolation_messages" on messages
  for select using (lead_id in (
    select id from leads where office_id = (
      select office_id from users where id = auth.uid()
    )
  ));

create policy "office_isolation_messages_insert" on messages
  for insert with check (lead_id in (
    select id from leads where office_id = (
      select office_id from users where id = auth.uid()
    )
  ));

-- Activities
create policy "office_isolation_activities" on activities
  for select using (lead_id in (
    select id from leads where office_id = (
      select office_id from users where id = auth.uid()
    )
  ));

-- =============================================
-- Functions & Triggers
-- =============================================

-- تحديث updated_at تلقائياً
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at();
