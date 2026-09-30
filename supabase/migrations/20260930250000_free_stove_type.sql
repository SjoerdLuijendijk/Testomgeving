-- "Type kachel" becomes free text with suggestions. Known types keep their key ('wood', ...), so
-- the web shop categories still work; any other type is stored as the text itself. Compatible
-- with the app version before this change, which only writes the known keys.
alter table public.stoves drop constraint stoves_stove_type_check;
alter table public.stoves add constraint stoves_stove_type_length check (char_length(stove_type) between 1 and 100);
