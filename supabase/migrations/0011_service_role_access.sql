-- Phase 11: give the server's service role the access Supabase normally gives it.
--
-- "Automatically expose new tables" is off for this project, so even the service role (used only by server
-- code, never in the browser, and exempt from Row Level Security by design) had no grants on our tables.
-- This restores the usual setup for existing tables and anything created later.

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
