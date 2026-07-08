-- Adds a reason field to declined bookings.
alter table bookings add column decline_reason text;
