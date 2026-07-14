"use client";

/**
 * Sources modal — lists every provider with its kind, capabilities, and
 * configuration state; toggles persist via useProviderPrefs (Supabase).
 */
import { useQuery } from "@tanstack/react-query";
import { Modal, Tag } from "@/components/meridian";
import { api, type ProviderInfo } from "@/lib/api-client";
import { useModals } from "@/lib/hooks/useModals";
import { useProviderPrefs } from "@/lib/hooks/data";

const KIND: Record<string, string> = {
  demo: "Sample data",
  digikey: "Distributor",
  mouser: "Distributor",
  lcsc: "Distributor",
  octopart: "Aggregator",
  snapmagic: "CAD library",
  ultralibrarian: "CAD library",
};

export function SourcesModal() {
  const { isOpen, close } = useModals();
  const { data: providersData } = useQuery({
    queryKey: ["providers"],
    queryFn: () => api.providers(),
    staleTime: 60_000,
    enabled: isOpen("sources"),
  });
  const { data: prefs = [], set } = useProviderPrefs();

  const providers: ProviderInfo[] = providersData?.providers ?? [];
  const liveCount = providers.filter((p) => p.configured).length;

  function enabledFor(p: ProviderInfo): boolean {
    const pref = prefs.find((x) => x.provider === p.name);
    return pref ? pref.enabled : true;
  }

  return (
    <Modal
      open={isOpen("sources")}
      onClose={close}
      className="max-w-[560px]"
      title={
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-px w-[22px] bg-current" />
          Search sources · {liveCount} live
        </span>
      }
    >
      <p className="mb-3.5 text-[12px] leading-relaxed text-ink2">
        Every search queries all enabled sources at once. Distributors answer price and
        stock, manufacturers and aggregators answer specs and datasheets, CAD libraries
        answer symbols and footprints. Toggle one off and it&apos;s skipped immediately.
      </p>

      <div className="panel">
        {providers.map((p) => {
          const configured = p.configured;
          const enabled = enabledFor(p);
          return (
            <div
              key={p.name}
              className="trow"
              style={{ gridTemplateColumns: "1.2fr 110px 84px" }}
            >
              <span className="text-[12.5px] font-semibold">{p.display_name}</span>
              <span className="lbl text-[8.5px]">{KIND[p.name] ?? "Provider"}</span>
              <div className="flex justify-end">
                {configured ? (
                  <button
                    className={`btn sm ${enabled ? "on" : ""}`}
                    onClick={() => set.mutate({ provider: p.name, enabled: !enabled })}
                  >
                    {enabled ? "On" : "Off"}
                  </button>
                ) : (
                  <Tag kind="mut" title={p.how_to_enable}>
                    Not configured
                  </Tag>
                )}
              </div>
            </div>
          );
        })}
        {providers.length === 0 && (
          <div className="p-4 text-[12px] text-ink3">Loading sources…</div>
        )}
      </div>

      <div className="pt-3">
        <span className="mono text-[9.5px] text-ink3">
          Changes apply to your next search.
        </span>
      </div>
    </Modal>
  );
}
