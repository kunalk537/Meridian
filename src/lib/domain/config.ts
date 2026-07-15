/**
 * Runtime configuration via environment variables — TS port of config.py.
 * Same variable names as the Python server so deployments carry over.
 */

/** Public base URL of this app, used to build export/asset links. */
export function baseUrl(): string {
  const raw =
    process.env.COMPONENTHUB_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
    "http://127.0.0.1:3000";
  return raw.replace(/\/+$/, "");
}

function parseList(raw: string | undefined): Set<string> | null {
  if (!raw) return null;
  const set = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return set;
}

/** Allowlist of providers; if set, only these are active. */
export function enabledProviders(): Set<string> | null {
  return parseList(process.env.ENABLED_PROVIDERS);
}

/** Denylist of providers. */
export function disabledProviders(): Set<string> {
  return parseList(process.env.DISABLED_PROVIDERS) ?? new Set();
}

export const digikeyClientId = () => process.env.DIGIKEY_CLIENT_ID || null;
export const digikeyClientSecret = () => process.env.DIGIKEY_CLIENT_SECRET || null;
export const mouserApiKey = () => process.env.MOUSER_API_KEY || null;
export const snapmagicToken = () => process.env.SNAPMAGIC_TOKEN || null;
export const nexarClientId = () => process.env.NEXAR_CLIENT_ID || null;
export const nexarClientSecret = () => process.env.NEXAR_CLIENT_SECRET || null;
export const ultralibrarianClientId = () => process.env.ULTRA_LIBRARIAN_CLIENT_ID || null;
export const ultralibrarianClientSecret = () =>
  process.env.ULTRA_LIBRARIAN_CLIENT_SECRET || null;
export const ultralibrarianApiBase = () =>
  (process.env.ULTRA_LIBRARIAN_API_BASE || "https://api.ultralibrarian.com").replace(
    /\/+$/,
    "",
  );
export const ultralibrarianTokenUrl = () =>
  process.env.ULTRA_LIBRARIAN_TOKEN_URL ||
  "https://identity.ultralibrarian.com/connect/token";
export const oemsecretsApiKey = () =>
  process.env.OEMSECRETS_API_KEY || process.env.OEMSECRETS || null;
export const oemsecretsCountryCode = () => process.env.OEMSECRETS_COUNTRY_CODE || null;
export const oemsecretsCurrency = () => process.env.OEMSECRETS_CURRENCY || "USD";
