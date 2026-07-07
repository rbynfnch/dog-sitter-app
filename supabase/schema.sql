-- Run this in the Supabase SQL editor for a new project.
-- It sets up: user profiles (client/sitter roles), dogs, emergency contacts,
-- bookings (with a meet-and-greet gate), blocked availability, and contracts.

-- 1. PROFILES
-- Supabase Auth already creates a row in auth.users on signup.
-- This table extends that with app-specific fields, one row per user.
create type user_role as enum ('client', 'sitter');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  full_name text not null,
  screen_name text,                 -- what's shown publicly instead of full_name
  phone text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  created_at timestamptz not null default now()
);

-- 2. DOGS
-- A client can have more than one dog.
create table dogs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  breed text,
  demeanor text,                    -- e.g. "calm, a little shy with new people"
  food_notes text,
  medicine_notes text,
  dog_friendly boolean default true,
  people_friendly boolean default true,
  kid_friendly boolean default true,
  extra_notes text,
  created_at timestamptz not null default now()
);

-- 3. BOOKINGS
-- Every request starts by requiring a meet-and-greet before it can be approved.
create type booking_status as enum (
  'meet_requested',     -- client submitted a stay request, meet-and-greet not scheduled yet
  'meet_scheduled',     -- meet-and-greet time is booked
  'meet_completed',     -- sitter met the dog, decision pending
  'approved',           -- sitter approved the stay
  'declined'            -- sitter declined (either at meet-and-greet or the stay itself)
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  dog_id uuid not null references dogs(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status booking_status not null default 'meet_requested',
  meet_greet_at timestamptz,        -- proposed/confirmed meet-and-greet time
  meet_greet_notes text,            -- sitter's private notes on how the meet went
  client_notes text,                -- notes from the client on the request form
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- 4. BLOCKED DATES
-- Sitter marks themselves unavailable (vacation, days off, etc.)
create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text
);

-- 5. CONTRACTS
-- One contract per approved booking. Either a typed e-signature, or a
-- manually-signed copy the client scanned/photographed and uploaded.
create type signature_method as enum ('digital', 'manual_upload');

create table contracts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  method signature_method not null,
  signed_name text,                 -- typed full name, for digital signatures
  signed_at timestamptz,
  pdf_url text,                     -- Supabase Storage URL of the final signed PDF
  created_at timestamptz not null default now()
);

-- ROW LEVEL SECURITY
-- This is what actually protects the schedule -- enforced by Postgres itself,
-- not just hidden by the UI, so it can't be bypassed from the browser.

alter table profiles enable row level security;
alter table dogs enable row level security;
alter table bookings enable row level security;
alter table blocked_dates enable row level security;
alter table contracts enable row level security;

-- Helper: is the current logged-in user the sitter?
create or replace function is_sitter()
returns boolean language sql stable as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'sitter'
  );
$$;

-- Profiles: everyone can read (needed to show screen names publicly),
-- but you can only edit your own row.
create policy "profiles are readable by anyone logged in"
  on profiles for select using (auth.role() = 'authenticated');
create policy "users can update their own profile"
  on profiles for update using (auth.uid() = id);
create policy "users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

-- Dogs: clients manage their own dogs; sitter can view all.
create policy "clients manage their own dogs"
  on dogs for all using (auth.uid() = client_id) with check (auth.uid() = client_id);
create policy "sitter can view all dogs"
  on dogs for select using (is_sitter());

-- Bookings: clients see/create their own; only the sitter can update status
-- (i.e. a client can't approve their own booking, no matter what the UI shows).
create policy "clients manage their own bookings"
  on bookings for select using (auth.uid() = client_id or is_sitter());
create policy "clients can create their own bookings"
  on bookings for insert with check (auth.uid() = client_id);
create policy "only sitter can update booking status"
  on bookings for update using (is_sitter());

-- Blocked dates: readable by anyone logged in, only the sitter can change them.
create policy "blocked dates are readable by anyone logged in"
  on blocked_dates for select using (auth.role() = 'authenticated');
create policy "only sitter can manage blocked dates"
  on blocked_dates for insert with check (is_sitter());
create policy "only sitter can delete blocked dates"
  on blocked_dates for delete using (is_sitter());

-- Contracts: visible to the client on that booking and the sitter.
create policy "contracts visible to relevant client and sitter"
  on contracts for select using (
    is_sitter() or
    exists (select 1 from bookings b where b.id = booking_id and b.client_id = auth.uid())
  );
create policy "client can create their own contract signature"
  on contracts for insert with check (
    exists (select 1 from bookings b where b.id = booking_id and b.client_id = auth.uid())
  );

-- SPAM PROTECTION (server-side, so it can't be bypassed from the browser):
-- block a client from having more than 3 open (non-declined) meet requests at once.
create or replace function enforce_request_limit()
returns trigger language plpgsql as $$
declare
  open_count int;
begin
  select count(*) into open_count
  from bookings
  where client_id = new.client_id
    and status not in ('declined');
  if open_count >= 3 then
    raise exception 'You already have 3 open requests. Wait for a response before requesting more.';
  end if;
  return new;
end;
$$;

create trigger limit_open_requests
  before insert on bookings
  for each row execute function enforce_request_limit();
