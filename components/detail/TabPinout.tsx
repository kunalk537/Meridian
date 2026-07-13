"use client";

import { Panel } from "@/components/meridian";
import type { ComponentDetails } from "@/lib/domain/models";

interface TabPinoutProps {
  details: ComponentDetails;
}

export function TabPinout({ details }: TabPinoutProps) {
  // Demo data doesn't include pinout, so show empty state
  const hasPins = false;

  if (!hasPins) {
    return (
      <Panel className="py-12 px-10 text-center">
        <div className="mono text-xs text-ink3">
          PINOUT NOT YET FETCHED · request from {details.manufacturer}
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="max-w-[520px]">
      <div className="thead g-pin">
        <span className="thb">Pin</span>
        <span className="thb">Name</span>
        <span className="thb">Type</span>
      </div>
      {/* Pin rows would be rendered here */}
    </Panel>
  );
}
