-- Hourly rate for installation work ("Montage"), excluding VAT, set under Bedrijfsgegevens. Quotes
-- and invoices add a montage line at this rate. Optional and additive, so safe for production.
alter table public.company_settings
  add column hourly_rate_ex_cents bigint check (hourly_rate_ex_cents between 0 and 10000000);
