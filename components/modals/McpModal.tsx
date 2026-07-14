"use client";

/**
 * MCP server modal — connection details + tool reference for Meridian's
 * built-in MCP endpoint (app/api/[transport]/route.ts, served at /api/mcp).
 * Tool list/descriptions mirror README.md's "MCP tools" table. The endpoint
 * requires a per-user API key (mcp_api_keys, fetched/created via
 * lib/data/mcpKeys.ts) sent as `Authorization: Bearer <key>`.
 */
import { useEffect, useState } from "react";
import { Modal, Tag } from "@/components/meridian";
import { useModals } from "@/lib/hooks/useModals";
import { useToast } from "@/lib/hooks/useToast";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateMcpApiKey, regenerateMcpApiKey } from "@/lib/data/mcpKeys";

const TOOLS: { name: string; desc: string; capability: string }[] = [
  { name: "list_providers", desc: "Providers, their capabilities, and configuration status", capability: "providers" },
  { name: "search_components", desc: "Fan-out live search across selected providers; merged by MPN, unranked", capability: "search" },
  { name: "get_component_details", desc: "Full specs, package, lifecycle, pricing, stock, CAD assets", capability: "details" },
  { name: "get_pricing", desc: "Live price breaks and stock from one provider", capability: "pricing" },
  { name: "get_datasheet", desc: "Datasheet URL", capability: "datasheet" },
  { name: "get_cad_models", desc: "Symbol / footprint / STEP availability and URLs", capability: "cad_models" },
  { name: "get_export_link", desc: "Browser link to the export page for the selected part", capability: "export" },
  { name: "recent_searches", desc: "In-memory search history (query, time, providers — never components)", capability: "history" },
];

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function McpModal() {
  const { isOpen, close } = useModals();
  const { toast } = useToast();
  const configured = isSupabaseConfigured();
  const [origin, setOrigin] = useState("");
  const [tab, setTab] = useState<"cli" | "json">("cli");
  const [signedIn, setSignedIn] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState(false);
  const [keyError, setKeyError] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    if (!isOpen("mcp")) return;
    setOrigin(window.location.origin);
    if (!configured) return;

    let cancelled = false;
    setKeyError(false);
    createClient()
      .auth.getUser()
      .then(async ({ data }) => {
        if (cancelled || !data.user) return;
        setSignedIn(true);
        setLoadingKey(true);
        try {
          const key = await getOrCreateMcpApiKey();
          if (cancelled) return;
          if (key) setApiKey(key);
          else setKeyError(true);
        } catch {
          if (!cancelled) setKeyError(true);
        } finally {
          if (!cancelled) setLoadingKey(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, configured, retryTick]);

  const endpoint = `${origin || ""}/api/mcp`;
  const keyPlaceholder = "<your-api-key>";
  const displayKey = apiKey ? (revealed ? apiKey : `${apiKey.slice(0, 7)}${"•".repeat(24)}`) : "";

  const cliSnippet =
    `claude mcp add --transport http meridian ${endpoint} \\\n` +
    `  --header "Authorization: Bearer ${apiKey ?? keyPlaceholder}"`;
  const jsonSnippet = JSON.stringify(
    {
      mcpServers: {
        meridian: {
          type: "http",
          url: endpoint,
          headers: { Authorization: `Bearer ${apiKey ?? keyPlaceholder}` },
        },
      },
    },
    null,
    2,
  );

  async function copyEndpoint() {
    if (await copy(endpoint)) toast("Endpoint copied", "ok");
  }

  async function copyKey() {
    if (apiKey && (await copy(apiKey))) toast("API key copied", "ok");
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      const key = await regenerateMcpApiKey();
      if (!key) {
        toast("Couldn't regenerate the key", "bad");
        return;
      }
      setApiKey(key);
      setKeyError(false);
      setRevealed(true);
      toast("API key regenerated — the old key stopped working", "ok");
    } catch {
      toast("Couldn't regenerate the key", "bad");
    } finally {
      setRegenerating(false);
    }
  }

  function retryLoadKey() {
    setKeyError(false);
    setRetryTick((t) => t + 1);
  }

  return (
    <Modal
      open={isOpen("mcp")}
      onClose={close}
      className="max-w-[640px]"
      title={
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-px w-[22px] bg-current" />
          MCP server
          <Tag kind="ok">Live</Tag>
        </span>
      }
    >
      <p className="sub mb-4">
        Point Claude — or any MCP client — at Meridian and your agent can search parts,
        pull pricing and CAD, and read export links directly. Copy the endpoint below, or
        use the ready-made config for your client.
      </p>

      <div className="panel mb-4 p-4">
        <div className="lbl mb-2.5">Endpoint</div>
        <div className="flex items-center gap-2">
          <span className="code flex-1 truncate px-3.5 py-2.5">{endpoint}</span>
          <button className="btn sm" onClick={copyEndpoint}>
            Copy
          </button>
        </div>
        <div className="kv mt-3 border-b-0">
          <span className="k">Auth</span>
          <span className="v">Bearer token, required — see API key below</span>
        </div>
      </div>

      <div className="panel mb-4 p-4">
        <div className="lbl mb-2.5">API key</div>
        {!configured && (
          <p className="sub m-0">
            Supabase isn&apos;t configured for this deployment, so API keys are disabled.
          </p>
        )}
        {configured && !signedIn && (
          <p className="sub m-0">Sign in to generate your API key.</p>
        )}
        {configured && signedIn && keyError && (
          <div className="flex items-center justify-between gap-3">
            <span className="sub m-0">Couldn&apos;t load your API key.</span>
            <button className="btn sm" onClick={retryLoadKey}>
              Retry
            </button>
          </div>
        )}
        {configured && signedIn && !keyError && (
          <>
            <div className="flex items-center gap-2">
              <span className="code flex-1 truncate px-3.5 py-2.5">
                {loadingKey ? "Generating…" : displayKey}
              </span>
              <button
                className="btn sm"
                onClick={() => setRevealed((r) => !r)}
                disabled={!apiKey}
              >
                {revealed ? "Hide" : "Show"}
              </button>
              <button className="btn sm" onClick={copyKey} disabled={!apiKey}>
                Copy
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="sub m-0">
                Regenerating invalidates the current key immediately.
              </span>
              <button
                className="btn sm"
                onClick={regenerate}
                disabled={regenerating || loadingKey || !apiKey}
              >
                {regenerating ? "Regenerating…" : "Regenerate"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="panel mb-4">
        <div className="flex gap-0.5 border-b border-line px-4 pt-2.5">
          <button
            className={`segbtn ${tab === "cli" ? "on" : ""}`}
            style={{ background: "none", padding: "8px 12px" }}
            onClick={() => setTab("cli")}
          >
            Claude Code
          </button>
          <button
            className={`segbtn ${tab === "json" ? "on" : ""}`}
            style={{ background: "none", padding: "8px 12px" }}
            onClick={() => setTab("json")}
          >
            JSON config
          </button>
        </div>
        <div className="p-4">
          <div className="code">{tab === "cli" ? cliSnippet : jsonSnippet}</div>
        </div>
      </div>

      <div className="panel mb-4">
        <div className="thead g-mcp">
          <span className="thb">Tool</span>
          <span className="thb">Description</span>
          <span className="thb">Capability</span>
        </div>
        {TOOLS.map((t) => (
          <div key={t.name} className="trow g-mcp">
            <span className="mono text-[12px] font-semibold text-acc">{t.name}</span>
            <span className="text-[12px] text-ink2">{t.desc}</span>
            <span className="mono text-[11px] text-ink3">{t.capability}</span>
          </div>
        ))}
      </div>

      <div className="panel border-l-2 border-l-acc p-4">
        <span className="lbl acc mb-2 block">Built for minimal token usage</span>
        <p className="m-0 text-[12.5px] leading-relaxed text-ink2">
          Tool responses omit any field that is null or missing — no empty keys, no
          repeated boilerplate — so agents can iterate on search constraints cheaply.
        </p>
      </div>
    </Modal>
  );
}
