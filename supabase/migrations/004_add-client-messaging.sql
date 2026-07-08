-- Turns messages into one continuous conversation per client, instead of
-- being fragmented across separate threads per booking. This is what
-- powers the new sitter "Clients" CRM view. booking_id becomes optional --
-- still there if you want to know which stay a message was about, but no
-- longer required.

alter table messages add column client_id uuid references profiles(id);

update messages m
set client_id = b.client_id
from bookings b
where m.booking_id = b.id and m.client_id is null;

alter table messages alter column client_id set not null;
alter table messages alter column booking_id drop not null;

-- Preserve message history even if a booking record is ever removed later.
alter table messages drop constraint messages_booking_id_fkey;
alter table messages add constraint messages_booking_id_fkey
  foreign key (booking_id) references bookings(id) on delete set null;

drop policy "messages visible to relevant client and sitter" on messages;
drop policy "relevant client or sitter can send messages" on messages;

create policy "messages visible to relevant client and sitter"
  on messages for select using (
    is_sitter() or client_id = auth.uid()
  );

create policy "relevant client or sitter can send messages"
  on messages for insert with check (
    sender_id = auth.uid() and (is_sitter() or client_id = auth.uid())
  );
