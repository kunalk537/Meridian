-- mcp_api_keys: one API key per user, used to authenticate requests to the
-- built-in MCP endpoint (app/api/[transport]/route.ts). Stored in plaintext
-- (not hashed) because the web UI re-displays it on demand from the MCP
-- modal; RLS restricts every row to its owner, and server-side lookups by
-- key value go through the service-role client (lib/supabase/admin.ts),
-- never the anon/authenticated roles.
create table if not exists public.mcp_api_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  api_key text not null unique,
  created_at timestamptz not null default now(),
  regenerated_at timestamptz
);

alter table public.mcp_api_keys enable row level security;

create policy "own mcp_api_keys" on public.mcp_api_keys
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
