"use client";

import { useCallback, useState } from "react";

type Tab = "cli" | "json" | "gui";

const SNIPPETS: Record<Tab, { label: string; content: React.ReactNode }> = {
  cli: {
    label: "CLI · Claude Code",
    content: (
      <pre className="m-0 overflow-x-auto whitespace-pre bg-[#08090a] p-5 font-mono text-[11.5px] leading-relaxed text-[#e4e8ea]">
        <span className="text-[#3ecf8e]">claude mcp add</span> --transport http
        componenthub \
        <br />
        &nbsp;&nbsp;http://127.0.0.1:3000/api/mcp \
        <br />
        &nbsp;&nbsp;--header{" "}
        <span className="text-[#f0b13c]">
          "Authorization: Bearer &lt;your-api-key&gt;"
        </span>
      </pre>
    ),
  },
  json: {
    label: "JSON · Claude Desktop",
    content: (
      <pre className="m-0 overflow-x-auto whitespace-pre bg-[#08090a] p-5 font-mono text-[11.5px] leading-relaxed text-[#e4e8ea]">
        {`{
  "mcpServers": {
    "componenthub": {
      "type": "http",
      "url": "http://127.0.0.1:3000/api/mcp",
      "headers": { "Authorization": "Bearer <key>" }
    }
  }
}`}
      </pre>
    ),
  },
  gui: {
    label: "GUI · Connector",
    content: (
      <div className="bg-[#08090a] p-6">
        <div className="mb-1.5 text-sm font-semibold">
          Add custom connector (claude.ai / Desktop)
        </div>
        <p className="m-0 text-[13px] leading-relaxed text-[#96a0a6]">
          Point it at the URL below and leave the OAuth fields blank — the
          endpoint runs an OAuth 2.1 server with Dynamic Client Registration, so
          Claude registers itself automatically. No token to paste.
        </p>
        <pre className="mt-3.5 overflow-x-auto whitespace-pre border border-[#1f2426] bg-[#0b0d0e] p-[14px_16px] font-mono text-xs text-[#e4e8ea]">
          https://&lt;deployment&gt;/api/mcp
        </pre>
      </div>
    ),
  },
};

const TAB_BASE =
  "cursor-pointer whitespace-nowrap border-none bg-transparent px-[18px] py-[13px] font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-[#5c666d]";
const TAB_ACTIVE =
  "cursor-pointer whitespace-nowrap border-none bg-[rgba(62,111,240,.06)] px-[18px] py-[13px] font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-[#e4e8ea]";

const COPY_BTN =
  "cursor-pointer border-none border-l border-[#1f2426] bg-transparent px-4 font-mono text-[9.5px] font-semibold uppercase tracking-[.08em] text-[#96a0a6]";

function ChatProof() {
  return (
    <div className="mx-auto mt-16 max-w-[720px] border border-[#1f2426] bg-[#08090a] text-left">
      <div className="flex items-center gap-[7px] border-b border-[#1f2426] px-[14px] py-[11px]">
        <div className="h-[9px] w-[9px] rounded-full bg-[#f0563f]" />
        <div className="h-[9px] w-[9px] rounded-full bg-[#f0b13c]" />
        <div className="h-[9px] w-[9px] rounded-full bg-[#3ecf8e]" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[.12em] text-[#5c666d]">
          claude · componenthub
        </span>
      </div>
      <div className="px-6 py-[22px] font-mono text-[12.5px] leading-relaxed">
        <div className="text-[#96a0a6]">▸ you</div>
        <div className="mb-[18px] mt-1 text-[#e4e8ea]">
          24V→5V buck regulator, 3A, SOT-223 or better, in stock
        </div>
        <div className="text-[#3e6ff0]">▸ componenthub · search_components</div>
        <div className="mb-1 mt-1 text-[#5c666d]">
          fan-out → digikey · mouser · octopart · lcsc
        </div>
        <div className="text-[#3ecf8e]">
          ◇ 41 parts merged by MPN — unranked, full specs returned
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [tab, setTab] = useState<Tab>("cli");
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    const texts: Record<Tab, string> = {
      cli: `claude mcp add --transport http componenthub \\
  http://127.0.0.1:3000/api/mcp \\
  --header "Authorization: Bearer <your-api-key>"`,
      json: JSON.stringify(
        {
          mcpServers: {
            componenthub: {
              type: "http",
              url: "http://127.0.0.1:3000/api/mcp",
              headers: { Authorization: "Bearer <key>" },
            },
          },
        },
        null,
        2,
      ),
      gui: "https://<deployment>/api/mcp",
    };
    const text = texts[tab];
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }, [tab]);

  return (
    <div
      className="mland"
      style={{
        background: "#050506",
        fontFamily: "var(--font-inter), system-ui, sans-serif",
      }}
    >
      {/* main container */}
      <div
        className="mx-auto"
        style={{
          width: "1080px",
          maxWidth: "100%",
          background: "#0b0d0e",
          border: "1px solid #1f2426",
          color: "#e4e8ea",
          overflow: "hidden",
        }}
      >
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between border-b border-[#1f2426] px-10 py-5">
          <div className="flex items-center gap-[11px]">
            <div className="flex h-[22px] w-[22px] items-center justify-center border-[1.5px] border-[#3e6ff0]">
              <div className="h-[7px] w-[7px] bg-[#3e6ff0]" />
            </div>
            <span
              className="text-[15px] font-bold tracking-[-.01em]"
              style={{ letterSpacing: "-.01em" }}
            >
              Meridian
            </span>
            <span className="border-l border-[#2b3234] pl-[11px] font-mono text-[9.5px] uppercase tracking-[.14em] text-[#5c666d]">
              ComponentHub&nbsp;MCP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#connect"
              className="px-3 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-[#96a0a6] no-underline"
            >
              Connect
            </a>
            <a
              href="#use-cases"
              className="px-3 py-2 font-mono text-[10px] uppercase tracking-[.1em] text-[#96a0a6] no-underline"
            >
              Examples
            </a>
            <a
              href="/search"
              className="rounded-[2px] bg-[#3e6ff0] px-[15px] py-[9px] font-mono text-[10px] font-bold uppercase tracking-[.08em] text-white no-underline"
            >
              Open Meridian
            </a>
          </div>
        </div>

        {/* --- HERO --- */}
        <div className="relative px-10 pb-24 pt-[104px] text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 30%,rgba(62,111,240,.14),transparent 70%)",
            }}
          />
          <div className="relative">
            <div className="mb-[26px] font-mono text-[10px] font-medium uppercase tracking-[.24em] text-[#3e6ff0]">
              Live parametric part search · over MCP
            </div>
            <h1 className="mx-auto m-0 text-[66px] font-extrabold leading-[1.02] tracking-[-.03em]">
              Every component, in the chat you already work in.
            </h1>
            <p className="mx-auto mt-7 max-w-[60ch] text-lg leading-relaxed text-[#96a0a6]">
              Meridian turns any MCP-speaking assistant — Claude Desktop, Claude
              Code, Cursor — into a live parametric search across DigiKey,
              Mouser, Octopart, LCSC and more. No database. No crawling. Every
              query hits the real distributors, in real time.
            </p>
            <div className="mt-10 flex justify-center gap-3">
              <a
                href="/search"
                className="rounded-[2px] bg-[#3e6ff0] px-[26px] py-[14px] font-mono text-xs font-bold uppercase tracking-[.08em] text-white no-underline"
              >
                Open Meridian&nbsp;↗
              </a>
              <a
                href="#"
                className="rounded-[2px] border border-[#2b3234] bg-transparent px-[26px] py-[14px] font-mono text-xs font-medium uppercase tracking-[.08em] text-[#e4e8ea] no-underline"
              >
                View on GitHub
              </a>
            </div>
          </div>
          <ChatProof />
        </div>

        {/* --- HOW IT THINKS --- */}
        <div className="border-t border-[#1f2426] px-10 py-24">
          <div className="mx-auto grid max-w-[900px] grid-cols-[220px_1fr] gap-12">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[.14em] text-[#3e6ff0]">
                § 01
              </div>
              <h2 className="m-0 mt-[14px] text-[40px] font-extrabold leading-[1.08] tracking-[-.025em]">
                How it thinks
              </h2>
            </div>
            <div className="flex flex-col">
              <div className="grid grid-cols-[40px_1fr] gap-5 border-t border-[#1f2426] py-6">
                <div className="font-mono text-[13px] text-[#5c666d]">01</div>
                <div>
                  <div className="text-[17px] font-bold tracking-[-.01em]">
                    Fetch, don&apos;t rank
                  </div>
                  <p className="m-0 mt-1.5 text-sm leading-relaxed text-[#96a0a6]">
                    No database, no baked-in comparison. Meridian returns every
                    normalized result and the model you&apos;re chatting with
                    does the ranking with full context of your board.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-5 border-t border-[#1f2426] py-6">
                <div className="font-mono text-[13px] text-[#5c666d]">02</div>
                <div>
                  <div className="text-[17px] font-bold tracking-[-.01em]">
                    Capabilities, not sites
                  </div>
                  <p className="m-0 mt-1.5 text-sm leading-relaxed text-[#96a0a6]">
                    The coordinator only calls providers configured for the
                    capability a request needs. Skipped ones come back in{" "}
                    <span className="font-mono text-[#e4e8ea]">
                      providers_skipped
                    </span>{" "}
                    with a hint to enable them.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-[40px_1fr] gap-5 border-b border-t border-[#1f2426] py-6">
                <div className="font-mono text-[13px] text-[#5c666d]">03</div>
                <div>
                  <div className="text-[17px] font-bold tracking-[-.01em]">
                    Nothing persists
                  </div>
                  <p className="m-0 mt-1.5 text-sm leading-relaxed text-[#96a0a6]">
                    Every call is live and normalized in memory. Even CAD export
                    assets are pulled from the provider on demand and bundled on
                    the fly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- CONNECT IT --- */}
        <div id="connect" className="border-t border-[#1f2426] px-10 py-24">
          <div className="mb-[52px] text-center">
            <div className="font-mono text-[10px] font-medium uppercase tracking-[.24em] text-[#5c666d]">
              Connect it
            </div>
            <h2 className="mx-auto m-0 mt-[18px] max-w-[20ch] text-[44px] font-extrabold leading-[1.08] tracking-[-.025em]">
              One endpoint. Every client.
            </h2>
            <p className="mx-auto mt-5 max-w-[60ch] text-base leading-relaxed text-[#96a0a6]">
              Grab your per-user key from the MCP server modal in the app, then
              point any client at{" "}
              <span className="font-mono text-[#e4e8ea]">/api/mcp</span>.
            </p>
          </div>
          <div className="mx-auto max-w-[840px] border border-[#1f2426] bg-[#0b0d0e]">
            <div className="flex items-stretch border-b border-[#2b3234]">
              {(["cli", "json", "gui"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTab(t);
                    setCopied(false);
                  }}
                  className={tab === t ? TAB_ACTIVE : TAB_BASE}
                >
                  {SNIPPETS[t].label}
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={copy} className={COPY_BTN}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            {SNIPPETS[tab].content}
          </div>
        </div>

        {/* --- IN PRACTICE --- */}
        <div
          id="use-cases"
          className="border-t border-[#1f2426] bg-[#08090a] px-10 py-24"
        >
          <div className="mb-[52px] text-center">
            <div className="font-mono text-[10px] font-medium uppercase tracking-[.24em] text-[#5c666d]">
              In practice
            </div>
            <h2 className="mx-auto m-0 mt-[18px] max-w-[20ch] text-[44px] font-extrabold leading-[1.08] tracking-[-.025em]">
              From vague spec to a KiCad zip.
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-[#1f2426] bg-[#0b0d0e]">
              <div className="border-b border-[#1f2426] px-5 py-[14px] font-mono text-[10px] uppercase tracking-[.14em] text-[#3e6ff0]">
                Case A · Regulator search
              </div>
              <div className="px-[22px] py-[22px] font-mono text-xs leading-relaxed">
                <div className="text-[#96a0a6]">▸ you</div>
                <div className="mb-4 mt-[3px] text-[#e4e8ea]">
                  Find a 24V→5V reg, 3A, SOT-223 or better, RoHS, DigiKey in
                  stock
                </div>
                <div className="text-[#3e6ff0]">▸ search_components</div>
                <div className="mb-[14px] mt-[3px] text-[#5c666d]">
                  digikey · mouser · octopart · lcsc → 41 merged
                </div>
                <div className="text-[#3ecf8e]">
                  ◇ LM2596S-5.0 · LMR33630 · TPS5430
                </div>
                <div className="mt-2.5 leading-relaxed text-[#96a0a6]">
                  Claude ranks them against your spec and explains the
                  trade-offs — Meridian just supplied the raw, unranked facts.
                </div>
              </div>
            </div>
            <div className="border border-[#1f2426] bg-[#0b0d0e]">
              <div className="border-b border-[#1f2426] px-5 py-[14px] font-mono text-[10px] uppercase tracking-[.14em] text-[#3e6ff0]">
                Case B · Export to CAD
              </div>
              <div className="px-[22px] py-[22px] font-mono text-xs leading-relaxed">
                <div className="text-[#96a0a6]">▸ you</div>
                <div className="mb-4 mt-[3px] text-[#e4e8ea]">
                  Give me the export link for LM2596S-5.0
                </div>
                <div className="text-[#3e6ff0]">▸ get_export_link</div>
                <div className="mb-[14px] mt-[3px] break-all text-[#e4e8ea]">
                  …/export/digikey/LM2596S-5.0
                </div>
                <div className="text-[#3ecf8e]">
                  ◇ open → pick KiCad / Altium / EasyEDA / Fusion 360
                </div>
                <div className="mt-2.5 leading-relaxed text-[#96a0a6]">
                  One zip with symbol, footprint and STEP — fetched live,
                  nothing stored.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- PROVIDERS --- */}
        <div className="border-t border-[#1f2426] px-10 py-24 text-center">
          <div className="font-mono text-[10px] font-medium uppercase tracking-[.24em] text-[#5c666d]">
            Sources
          </div>
          <h2 className="mx-auto m-0 mt-[18px] max-w-[22ch] text-[44px] font-extrabold leading-[1.08] tracking-[-.025em]">
            Wire in the distributors you already use.
          </h2>
          <p className="mx-auto mt-5 max-w-[58ch] text-base leading-relaxed text-[#96a0a6]">
            Enable a provider by dropping its keys into{" "}
            <span className="font-mono text-[#e4e8ea]">.env</span>. Unconfigured
            ones are quietly skipped.
          </p>
          <div className="mx-auto mt-10 flex max-w-[820px] flex-wrap justify-center gap-[10px]">
            {[
              { name: "digikey", active: false },
              { name: "mouser", active: false },
              { name: "octopart", active: false },
              { name: "oemsecrets", active: false },
              { name: "lcsc · no key", active: true },
              { name: "snapmagic", active: false },
              { name: "ultralibrarian", active: false },
            ].map((p) => (
              <span
                key={p.name}
                className={`inline-flex items-center gap-2 rounded-[2px] px-[15px] py-[9px] font-mono text-xs ${
                  p.active
                    ? "border border-[rgba(62,111,240,.55)] bg-[rgba(62,111,240,.12)] text-[#e4e8ea]"
                    : "border border-[#2b3234] bg-[#101314] text-[#e4e8ea]"
                }`}
              >
                {p.active && (
                  <span className="inline-block h-[6px] w-[6px] rounded-[1px] bg-[#3ecf8e]" />
                )}
                {p.name}
              </span>
            ))}
          </div>
        </div>

        {/* --- CTA --- */}
        <div className="grid grid-cols-2 border-t border-[#1f2426]">
          <div className="border-r border-[#1f2426] px-10 py-[88px]">
            <h2 className="m-0 text-[44px] font-extrabold leading-[1.06] tracking-[-.025em]">
              Search parts from the chat you already use.
            </h2>
            <p className="m-0 mt-5 max-w-[40ch] text-[15px] text-[#96a0a6]">
              Built-in demo catalog works with zero keys and zero setup.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 bg-[#08090a] px-10 py-[88px]">
            <a
              href="/search"
              className="flex items-center justify-between rounded-[2px] bg-[#3e6ff0] px-[22px] py-4 font-mono text-xs font-bold uppercase tracking-[.08em] text-white no-underline"
            >
              Open Meridian <span>↗</span>
            </a>
            <a
              href="#"
              className="flex items-center justify-between rounded-[2px] border border-[#2b3234] px-[22px] py-4 font-mono text-xs font-medium uppercase tracking-[.08em] text-[#e4e8ea] no-underline"
            >
              View on GitHub <span>↗</span>
            </a>
          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="flex items-center justify-between border-t border-[#1f2426] px-10 py-[22px] font-mono text-[10px] uppercase tracking-[.1em] text-[#5c666d]">
          <span>Meridian · ComponentHub MCP</span>
          <span>No database · No crawling · Live only</span>
        </div>
      </div>
    </div>
  );
}
