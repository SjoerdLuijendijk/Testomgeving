-- A note's appointment can also be a viewing ("bezichtiging"), next to pickup and delivery, so the
-- agenda shows viewings of stoves in negotiation as well.
alter table public.stove_notes drop constraint stove_notes_handover_check;
alter table public.stove_notes add constraint stove_notes_handover_check check (handover in ('viewing', 'pickup', 'delivery'));
