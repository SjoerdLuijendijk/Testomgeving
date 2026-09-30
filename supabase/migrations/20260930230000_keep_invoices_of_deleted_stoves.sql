-- Invoices are permanent records, but stoves may be deleted. The invoice keeps the stove number as a
-- plain value (the seller, customer and lines are already copied onto it), so the foreign key to
-- stoves is dropped. create_invoice() still requires the stove to exist when the invoice is made.
-- Requires the app version that loads invoices without joining them to stoves.
alter table public.invoices drop constraint invoices_stove_number_fkey;
