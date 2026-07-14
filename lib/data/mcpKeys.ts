"use server";

import { randomBytes } from "node:crypto";
import { createClient, getUser } from "@/lib/supabase/server";

function generateApiKey(): string {
  return `mk_${randomBytes(24).toString("base64url")}`;
}

/** Returns the signed-in user's MCP API key, generating one on first use. */
export async function getOrCreateMcpApiKey(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("mcp_api_keys")
    .select("api_key")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.api_key) return existing.api_key;

  const { data: inserted } = await supabase
    .from("mcp_api_keys")
    .upsert(
      { user_id: user.id, api_key: generateApiKey() },
      { onConflict: "user_id", ignoreDuplicates: true },
    )
    .select("api_key")
    .maybeSingle();
  if (inserted?.api_key) return inserted.api_key;

  // Another request created the key between the select and the upsert above.
  const { data: retry } = await supabase
    .from("mcp_api_keys")
    .select("api_key")
    .eq("user_id", user.id)
    .maybeSingle();
  return retry?.api_key ?? null;
}

/** Replaces the signed-in user's MCP API key and returns the new value. */
export async function regenerateMcpApiKey(): Promise<string | null> {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("mcp_api_keys")
    .upsert(
      { user_id: user.id, api_key: generateApiKey(), regenerated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select("api_key")
    .single();
  return data?.api_key ?? null;
}
