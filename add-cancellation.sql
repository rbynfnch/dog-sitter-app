-- Adds a 'cancelled' status (distinct from 'declined' -- declined is the
-- sitter rejecting a request before it's approved; cancelled can happen at
-- any stage, including after approval, by either party) plus who cancelled
-- and why.

alter type booking_status add value 'cancelled';

alter table bookings add column cancelled_by text check (cancelled_by in ('client', 'sitter'));
alter table bookings add column cancel_reason text;

-- The sitter can already update any booking (existing policy). This adds a
-- narrow exception: a client can update their OWN booking, but only ever
-- to set it to 'cancelled' -- they still can't approve their own request or
-- change any other status, no matter what the UI shows.
create policy "clients can cancel their own bookings"
  on bookings for update
  using (auth.uid() = client_id)
  with check (status = 'cancelled');
