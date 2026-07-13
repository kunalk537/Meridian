/**
 * Rule-based answer engine for the Copilot bar.
 * Ported from the prototype (website/ComponentHub.dc.html).
 * Matches user questions against topic regexes and returns canned answers.
 * Uses `data` from the surface context when helpful.
 */

export type Surface = "results" | "detail" | "compare";

/* ------------------------------------------------------------------ Presets */
/** Per-surface preset question strings (displayed as chips). */
export const PRESETS: Record<Surface, string[]> = {
  results: [
    "Which one is cheapest?",
    "Which is most efficient?",
    "Best for a tight thermal budget?",
  ],
  detail: [
    "Is this in stock?",
    "What are the alternatives?",
    "Why pick this part?",
  ],
  compare: [
    "Which has lower power?",
    "Which has real USB support?",
    "Which has the best DC precision?",
  ],
};

/** Placeholder text per surface. */
export const PLACEHOLDER: Record<Surface, string> = {
  results:
    "Ask copilot a follow-up \u2014 e.g. which of these runs coolest?",
  detail: "Ask copilot about this part \u2014 stock, price, alternatives...",
  compare: "Ask copilot about this comparison...",
};

/* ------------------------------------------------------------------ Answers */

/** Dataset-keyed preset answers (used when data matches a known dataset). */
const DATASET_PRESETS: Record<string, { q: string; a: string }[]> = {
  reg: [
    {
      q: "Which one is cheapest?",
      a: "MP1584EN at $0.41 on LCSC \u2014 but non-synchronous. LMR33630 ($1.62) ranked first overall.",
    },
    {
      q: "Which is most efficient?",
      a: "LT8609 (~93%) and LMR33630 (~92%) lead. LM2596 is ~75% old design.",
    },
    {
      q: "Best for a tight thermal budget?",
      a: "Go synchronous: LMR33630 or LT8609. ~1/3 the heat of LM2596.",
    },
  ],
  esp: [
    {
      q: "Which one is cheapest?",
      a: "ESP32-C3 at $1.15 (LCSC), but USB Serial only. C6 ($1.87) has USB-C.",
    },
    {
      q: "Which has real USB support?",
      a: "S3 and S3-MINI have native USB OTG. C6/C3 have USB Serial/JTAG.",
    },
    {
      q: "Which has lower power?",
      a: "C6 (RISC-V, Wi-Fi 6 target wake) has best idle/sleep. S3 draws more.",
    },
  ],
  opamp: [
    {
      q: "Which has the lowest noise?",
      a: "LT1028 at 0.85 nV/\u221a(Hz) but needs +/-4V. OPA2189 (5.2) better for 5V.",
    },
    {
      q: "Which one is cheapest?",
      a: "OPA333 at $2.20, runs on 1.8\u20135.5V.",
    },
    {
      q: "Which has the best DC precision?",
      a: "OPA2189 leads on offset and drift. OPA333 is close and cheaper.",
    },
  ],
};

/** Generic preset answers (surface-agnostic). */
const GENERIC: { q: string; a: string }[] = [
  {
    q: "What can you search?",
    a: "Plain language to exact MPNs. Live provider queries against Digi-Key, Mouser, LCSC, Octopart, and more.",
  },
  {
    q: "How do project BOMs work?",
    a: "Create a project, add parts, adjust quantities, and export as CSV or push to your EDA tool.",
  },
  {
    q: "How do I connect an agent over MCP?",
    a: "Run: claude mcp add meridian --transport http https://mcp.meridian.dev/v1",
  },
];

/* ---------------------------------------------------------------- Engine */

function tryDatasetPreset(q: string, dataset?: string): string | null {
  if (!dataset) return null;
  const presets = DATASET_PRESETS[dataset];
  if (!presets) return null;
  const lower = q.toLowerCase();
  const match = presets.find((p) => p.q.toLowerCase() === lower);
  return match?.a ?? null;
}

function tryGenericPreset(q: string): string | null {
  const lower = q.toLowerCase();
  const match = GENERIC.find((p) => p.q.toLowerCase() === lower);
  return match?.a ?? null;
}

function answerDetail(q: string, data?: unknown): string {
  const lower = q.toLowerCase();
  const part = (data ?? {}) as Record<string, unknown>;

  // Stock
  if (/stock|avail|lead/.test(lower)) {
    const mpn = typeof part.mpn === "string" ? part.mpn : "this part";
    return `As of the latest query, ${mpn} is in stock across multiple distributors. Check the offers table above for live distributor-level counts and lead times.`;
  }

  // Alternatives
  if (/alt|similar|instead|other|replace/.test(lower)) {
    const mpn = typeof part.mpn === "string" ? part.mpn : "this part";
    return `Top alternatives to ${mpn}: check the alternatives section above for price, package, and availability comparisons from the same search results.`;
  }

  // Why this part
  if (/why|pick|good|worth|recommend|tradeoff|downside|weak/.test(lower)) {
    const mpn = typeof part.mpn === "string" ? part.mpn : "This part";
    return `${mpn} is selected for its balance of price, availability, and specifications. Review the offers table for trade-offs between lead time, unit price, and distributor reliability.`;
  }

  // Price
  if (/price|cost|cheap|budget/.test(lower)) {
    return "Check the offers table above for per-distributor pricing. The best unit price often comes with higher MOQ or longer lead time.";
  }

  // CAD
  if (/cad|footprint|symbol|step|model/.test(lower)) {
    return "CAD models (symbol, footprint, STEP) are available from Ultra Librarian and SnapMagic when supported. Check the CAD section on this page.";
  }

  return fallbackAnswer();
}

function answerResults(q: string, data?: unknown): string {
  const lower = q.toLowerCase();
  const dataset = typeof data === "string" ? data : undefined;

  // Try dataset presets first
  const dsPreset = tryDatasetPreset(q, dataset);
  if (dsPreset) return dsPreset;

  // Cheap
  if (/cheap|cost|price|afford|budget/.test(lower)) {
    return "Sort the results table by unit price (ascending). The cheapest option is highlighted, but check stock and lead time before committing.";
  }

  // Stock
  if (/stock|avail|lead|supply/.test(lower)) {
    return "Sort by stock count to see the deepest inventory. Parts with zero stock or long lead times are flagged with warnings in the table.";
  }

  // Efficiency / thermal
  if (/efficien|thermal|heat|hot|cool|dissipat/.test(lower)) {
    return "For efficiency, look at the synchronous regulators (LMR33630, LT8609) in the table. They run ~90%+ vs ~75% for older designs like LM2596.";
  }

  // Noise
  if (/noise|quiet/.test(lower)) {
    return "For low-noise applications, check the op-amp noise specs. LT1028 is lowest (0.85 nV/\u221aHz) but OPA2189 (5.2) works better at 5V single supply.";
  }

  // USB
  if (/usb/.test(lower)) {
    return "For native USB OTG, choose ESP32-S3 or S3-MINI. The C6 and C3 offer USB Serial/JTAG only.";
  }

  // Datasheet
  if (/datasheet/.test(lower)) {
    return "Click the datasheet icon on any result row to open the manufacturer datasheet in a new tab.";
  }

  // MCP / Agent
  if (/mcp|agent|api|claude/.test(lower)) {
    return "Connect via MCP: claude mcp add meridian --transport http https://mcp.meridian.dev/v1. This lets Claude, Cursor, or any MCP client search parts and manage BOMs.";
  }

  // Providers
  if (/provider|source|where/.test(lower)) {
    return "Active providers are listed in the MCP settings panel. Enable or disable providers in Settings \u2192 Providers.";
  }

  // Best / recommend
  if (/best|recommend|pick|choose|which/.test(lower)) {
    return "Review the results table sorted by relevance. The top row is the best overall match for your search query.";
  }

  return fallbackAnswer();
}

function answerCompare(q: string, _data?: unknown): string {
  const lower = q.toLowerCase();

  const dsPreset = tryDatasetPreset(q);
  if (dsPreset) return dsPreset;

  if (/price|cost|cheap/.test(lower)) {
    return "Compare unit prices in the table above. Remember to factor in MOQ, lead time, and distributor fees.";
  }

  if (/stock|avail/.test(lower)) {
    return "Check the stock columns side-by-side. Parts with deep stock across multiple distributors give you more sourcing flexibility.";
  }

  if (/efficien|thermal|heat/.test(lower)) {
    return "For efficiency comparisons, look at the specifications panel. Synchronous converters generally outperform older designs.";
  }

  if (/noise|quiet/.test(lower)) {
    return "Compare input-referred noise and 1/f corner frequency. Lower is better for precision signal chains.";
  }

  if (/usb|interface/.test(lower)) {
    return "Compare USB support: S3 has native OTG, C6/C3 have Serial/JTAG. Check other interfaces (SPI, I2C, UART) in the specs.";
  }

  if (/power|consumption|sleep/.test(lower)) {
    return "Compare sleep current and active power draw. RISC-V variants (C6) tend to have lower idle power.";
  }

  if (/best|recommend|pick|choose|which/.test(lower)) {
    return "Use the comparison table to weigh trade-offs. The best choice depends on your specific constraints: budget, power, interfaces, or package size.";
  }

  return fallbackAnswer();
}

function fallbackAnswer(): string {
  return "Try asking about price, stock, alternatives, or part numbers. I can help compare specs and find the best option for your design.";
}

/* ---------------------------------------------------------------- Public */

/**
 * Given a user question, the current surface, and optional context data,
 * return a canned answer string.
 */
export function answerFor(
  question: string,
  surface: Surface,
  data?: unknown,
): string {
  // Try generic presets first (works for all surfaces)
  const gp = tryGenericPreset(question);
  if (gp) return gp;

  switch (surface) {
    case "detail":
      return answerDetail(question, data);
    case "results":
      return answerResults(question, data);
    case "compare":
      return answerCompare(question, data);
    default:
      return fallbackAnswer();
  }
}
