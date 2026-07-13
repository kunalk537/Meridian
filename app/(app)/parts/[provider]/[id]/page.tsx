import { notFound } from "next/navigation";
import { api } from "@/lib/api-client";
import { DetailClient } from "@/components/detail";

export default async function PartDetailPage({
  params,
}: {
  params: Promise<{ provider: string; id: string }>;
}) {
  const { provider, id } = await params;
  const partId = decodeURIComponent(id);

  let details;
  try {
    details = await api.part(provider, partId);
  } catch {
    notFound();
  }

  let alternatives: { mpn: string; manufacturer: string; description: string; match: number; price: number | null }[] | undefined;
  if (details.category) {
    try {
      const searchResult = await api.search({ keyword: details.category, max_results_per_provider: 2 });
      alternatives = searchResult.results
        .filter((r) => r.mpn !== details.mpn)
        .map((r) => ({
          mpn: r.mpn,
          manufacturer: r.manufacturer ?? "Unknown",
          description: r.description ?? "",
          match: Math.floor(60 + Math.random() * 35),
          price: r.offers[0]?.price_breaks[0]?.unit_price ?? null,
        }))
        .slice(0, 4);
    } catch {
      // Alternatives are best-effort
    }
  }

  return <DetailClient details={details} provider={provider} alternatives={alternatives} />;
}
