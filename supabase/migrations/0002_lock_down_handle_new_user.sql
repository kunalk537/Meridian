-- public.handle_new_user() is SECURITY DEFINER and only meant to run via the
-- on_auth_user_created trigger. By default Postgres grants EXECUTE on new
-- functions to PUBLIC, which PostgREST then exposes as a callable RPC
-- (/rest/v1/rpc/handle_new_user) for anon/authenticated. Revoke it — the
-- trigger still fires fine since it runs as the function owner, not the
-- calling role.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
