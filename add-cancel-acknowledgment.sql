-- Lets the sitter explicitly acknowledge a client-initiated cancellation,
-- so it doesn't just quietly vanish from their list with no confirmation
-- they ever saw it. Sitter-initiated cancellations don't need this (they
-- obviously already know), so those default to already-acknowledged.
alter table bookings add column acknowledged_by_sitter boolean not null default true;
