-- One conversation thread per booking. Used for negotiating a
-- meet-and-greet time, drop-off/pickup details, or anything else that
-- needs a back-and-forth between the client and sitter for that stay.
create table messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

-- Only the client on that booking, or the sitter, can read or send messages
-- tied to it -- same pattern as the contracts table.
create policy "messages visible to relevant client and sitter"
  on messages for select using (
    is_sitter() or
    exists (select 1 from bookings b where b.id = booking_id and b.client_id = auth.uid())
  );

create policy "relevant client or sitter can send messages"
  on messages for insert with check (
    sender_id = auth.uid() and (
      is_sitter() or
      exists (select 1 from bookings b where b.id = booking_id and b.client_id = auth.uid())
    )
  );

-- Enable realtime so new messages show up live without a manual refresh.
alter publication supabase_realtime add table messages;
