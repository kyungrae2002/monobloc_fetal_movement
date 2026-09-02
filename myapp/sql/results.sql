-- Read access to the survey, for the team, without a Supabase account.
--
-- Run this once in the Supabase SQL editor: paste the whole file and press Run.
-- To change the password later, edit the one line below and run it again.
--
-- WHY A FUNCTION RATHER THAN A POLICY
-- ---------------------------------------------------------------------------
-- The obvious way to show responses on the site is to allow SELECT on the
-- table. That cannot work here: the key the site carries is published inside
-- its own JavaScript, so anything that key may read, anyone may read. Opening
-- SELECT would put every written answer on the public internet.
--
-- So the table stays closed and this function is the only way through. It runs
-- as its owner, which is what lets it see past row level security, and it
-- refuses to return anything unless it is handed the password. The password
-- lives here and in whatever the team types into the page - never in the site's
-- code, and never in anything a visitor downloads.
--
-- Changing the password later means running this file again with a new one.

create or replace function public.feedback_for(token text)
returns setof public.feedback
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Compared in full rather than by prefix, and the failure says nothing about
  -- why: a message that distinguished "wrong password" from "no password"
  -- would be the first thing anyone guessing would use.
  if token is distinct from '3030' then
    raise exception 'not authorised' using errcode = '42501';
  end if;

  return query
    select * from public.feedback order by created_at desc;
end;
$$;

-- Only the anonymous role the site uses, and only this function. The table
-- itself remains unreadable through the API.
revoke all on function public.feedback_for(text) from public;
grant execute on function public.feedback_for(text) to anon;
