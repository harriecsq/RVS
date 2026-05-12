-- contacts: collapse first_name/last_name into a single `name` column.
-- Frontend uses a single name field; splitting on the server was lossy.

alter table contacts add column if not exists name text;

update contacts
set name = trim(both ' ' from coalesce(first_name, '') || ' ' || coalesce(last_name, ''))
where name is null;

alter table contacts alter column first_name drop not null;
alter table contacts alter column last_name  drop not null;
