/**
 * Provider registry — TS port of providers/__init__.py.
 * Add a connector by appending it to ALL_PROVIDERS.
 */
import { disabledProviders, enabledProviders } from "../config";
import { Provider, ProviderError } from "./base";
import { DemoProvider } from "./demo";
import { DigiKeyProvider } from "./digikey";
import { LcscProvider } from "./lcsc";
import { MouserProvider } from "./mouser";
import { OctopartProvider } from "./octopart";
import { OemsecretsProvider } from "./oemsecrets";
import { SnapMagicProvider } from "./snapmagic";
import { UltraLibrarianProvider } from "./ultralibrarian";

const ALL_PROVIDERS: Provider[] = [
  new DemoProvider(),
  new DigiKeyProvider(),
  new MouserProvider(),
  new LcscProvider(),
  new OctopartProvider(),
  new OemsecretsProvider(),
  new SnapMagicProvider(),
  new UltraLibrarianProvider(),
];

/**
 * ENABLED_PROVIDERS (allowlist) wins over DISABLED_PROVIDERS (denylist).
 * Filtering is evaluated per call so env changes take effect without a reload.
 */
function filterProviders(): Map<string, Provider> {
  const enabled = enabledProviders();
  const disabled = disabledProviders();
  const result = new Map<string, Provider>();
  for (const p of ALL_PROVIDERS) {
    if (enabled !== null) {
      if (enabled.has(p.name)) result.set(p.name, p);
    } else if (!disabled.has(p.name)) {
      result.set(p.name, p);
    }
  }
  return result;
}

export function allProviders(): Map<string, Provider> {
  return filterProviders();
}

export function getProvider(name: string): Provider {
  const provider = filterProviders().get(name.toLowerCase());
  if (!provider) {
    const available = [...filterProviders().keys()].sort().join(", ");
    throw new ProviderError(
      `Unknown provider ${JSON.stringify(name)}. Available: ${available}`,
    );
  }
  return provider;
}

export { Provider, ProviderError };
