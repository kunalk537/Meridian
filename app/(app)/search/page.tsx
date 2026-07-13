import { SearchHero } from "@/components/search/SearchHero";
import { HomePanels } from "@/components/search/HomePanels";

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-[1080px] px-8 py-6">
      <SearchHero />
      <HomePanels />
    </div>
  );
}
