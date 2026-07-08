-- IMPORTANT: the first statement below (ALTER TYPE) must be run as its
-- own separate query, not combined with anything else in the same batch --
-- Postgres will silently roll back the whole batch if it's bundled with
-- other statements. This bit us in testing; run each block separately.

-- ---- Run alone, as its own query ----
alter type booking_status add value if not exists 'cancelled';

-- ---- Then run this block together, as a second separate query ----
alter table bookings add column if not exists cancelled_by text
  check (cancelled_by in ('client', 'sitter'));
alter table bookings add column if not exists cancel_reason text;

drop policy if exists "clients can cancel their own bookings" on bookings;
create policy "clients can cancel their own bookings"
  on bookings for update
  using (auth.uid() = client_id)
  with check (status = 'cancelled');
