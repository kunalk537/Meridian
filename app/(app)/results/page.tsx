import { Suspense } from "react";
import { ResultsContent } from "@/components/results/ResultsContent";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[760px] px-8 py-14">
          <span className="lbl acc">Loading results...</span>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
