-- The original trigger only excluded 'declined' bookings from the open-
-- request count. Now that 'cancelled' exists as a separate status, it
-- needs excluding too -- a cancelled request shouldn't count against the
-- client's open-request limit.
create or replace function enforce_request_limit()
returns trigger language plpgsql as $$
declare
  open_count int;
begin
  select count(*) into open_count
  from bookings
  where client_id = new.client_id
    and status not in ('declined', 'cancelled');
  if open_count >= 3 then
    raise exception 'You already have 3 open requests. Wait for a response before requesting more.';
  end if;
  return new;
end;
$$;
