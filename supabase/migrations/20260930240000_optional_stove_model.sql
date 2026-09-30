-- The model is no longer entered: web shop names are brand plus stove type. Existing models are
-- kept but no longer shown. Must be applied before the app version that stops sending a model;
-- the version before it keeps working, because it always sends one.
alter table public.stoves alter column model drop not null;
