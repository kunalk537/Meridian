/**
 * Built-in demo provider with a small static catalog — TS port of demo.py.
 *
 * Lets the app work end-to-end (search -> details -> export) without any API
 * keys. Clearly labeled so users know the data is sample data, not live
 * distributor inventory. This provider ships in the foundation so every screen
 * renders real-looking data offline.
 */
import { baseUrl } from "../config";
import {
  type CadAsset,
  Capability,
  type ComponentDetails,
  type ComponentResult,
  type Offer,
  type PriceBreak,
  type SearchQuery,
} from "../models";
import { Provider, ProviderError } from "./base";

interface CatalogRow {
  mpn: string;
  manufacturer: string;
  description: string;
  category: string;
  package: string;
  datasheet_url: string;
  stock: number;
  prices: [number, number][];
  specs: Record<string, string>;
  lifecycle: string;
}

const CATALOG: CatalogRow[] = [
  {
    mpn: "ESP32-S3-WROOM-1-N8",
    manufacturer: "Espressif Systems",
    description:
      "ESP32-S3 Wi-Fi + Bluetooth 5 LE module, 8MB flash, USB OTG, SMD",
    category: "RF Modules / MCU",
    package: "SMD Module",
    datasheet_url:
      "https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf",
    stock: 15400,
    prices: [
      [1, 2.95],
      [10, 2.7],
      [100, 2.38],
    ],
    specs: {
      Core: "Xtensa dual-core LX7 @ 240MHz",
      Flash: "8 MB",
      PSRAM: "None",
      "Wi-Fi": "802.11 b/g/n",
      Bluetooth: "5.0 LE",
      USB: "USB OTG 1.1",
      "Operating Voltage": "3.0V - 3.6V",
    },
    lifecycle: "Active",
  },
  {
    mpn: "ESP32-C6-WROOM-1-N8",
    manufacturer: "Espressif Systems",
    description:
      "ESP32-C6 Wi-Fi 6 + Bluetooth 5 LE + 802.15.4 module, 8MB flash, SMD",
    category: "RF Modules / MCU",
    package: "SMD Module",
    datasheet_url:
      "https://www.espressif.com/sites/default/files/documentation/esp32-c6-wroom-1_wroom-1u_datasheet_en.pdf",
    stock: 9800,
    prices: [
      [1, 2.6],
      [10, 2.4],
      [100, 2.1],
    ],
    specs: {
      Core: "RISC-V single-core @ 160MHz",
      Flash: "8 MB",
      "Wi-Fi": "802.11 ax (Wi-Fi 6)",
      Bluetooth: "5.3 LE",
      "802.15.4": "Zigbee / Thread",
      USB: "USB Serial/JTAG",
      "Operating Voltage": "3.0V - 3.6V",
    },
    lifecycle: "Active",
  },
  {
    mpn: "STM32F405RGT6",
    manufacturer: "STMicroelectronics",
    description:
      "ARM Cortex-M4 MCU 168MHz, 1MB flash, 192KB RAM, USB OTG, LQFP-64",
    category: "Microcontrollers",
    package: "LQFP-64",
    datasheet_url: "https://www.st.com/resource/en/datasheet/stm32f405rg.pdf",
    stock: 3200,
    prices: [
      [1, 8.9],
      [10, 8.1],
      [100, 7.05],
    ],
    specs: {
      Core: "ARM Cortex-M4F @ 168MHz",
      Flash: "1 MB",
      RAM: "192 KB",
      USB: "OTG FS + HS",
      "Operating Voltage": "1.8V - 3.6V",
    },
    lifecycle: "Active",
  },
  {
    mpn: "LM2596S-5.0",
    manufacturer: "Texas Instruments",
    description:
      "4.5V-40V input, 5V 3A step-down (buck) voltage regulator, TO-263",
    category: "Voltage Regulators - DC DC Switching",
    package: "TO-263-5",
    datasheet_url: "https://www.ti.com/lit/ds/symlink/lm2596.pdf",
    stock: 22100,
    prices: [
      [1, 1.85],
      [10, 1.62],
      [100, 1.31],
    ],
    specs: {
      "Input Voltage": "4.5V - 40V",
      "Output Voltage": "5V fixed",
      "Output Current": "3A",
      Topology: "Buck",
      "Switching Frequency": "150 kHz",
    },
    lifecycle: "Active",
  },
  {
    mpn: "TPS54331DR",
    manufacturer: "Texas Instruments",
    description:
      "3.5V-28V input, 3A step-down converter with Eco-mode, SOIC-8",
    category: "Voltage Regulators - DC DC Switching",
    package: "SOIC-8",
    datasheet_url: "https://www.ti.com/lit/ds/symlink/tps54331.pdf",
    stock: 41000,
    prices: [
      [1, 0.98],
      [10, 0.84],
      [100, 0.62],
    ],
    specs: {
      "Input Voltage": "3.5V - 28V",
      "Output Voltage": "0.8V - 25V adjustable",
      "Output Current": "3A",
      Topology: "Buck",
      "Switching Frequency": "570 kHz",
    },
    lifecycle: "Active",
  },
  {
    mpn: "AMS1117-3.3",
    manufacturer: "Advanced Monolithic Systems",
    description: "1A low dropout linear regulator, 3.3V fixed, SOT-223",
    category: "Voltage Regulators - Linear (LDO)",
    package: "SOT-223",
    datasheet_url: "http://www.advanced-monolithic.com/pdf/ds1117.pdf",
    stock: 180000,
    prices: [
      [1, 0.12],
      [10, 0.09],
      [100, 0.05],
    ],
    specs: {
      "Output Voltage": "3.3V fixed",
      "Output Current": "1A",
      Dropout: "1.3V @ 1A",
    },
    lifecycle: "Active",
  },
  {
    mpn: "NE5532P",
    manufacturer: "Texas Instruments",
    description: "Dual low-noise operational amplifier, 10MHz GBW, DIP-8",
    category: "Operational Amplifiers",
    package: "DIP-8",
    datasheet_url: "https://www.ti.com/lit/ds/symlink/ne5532.pdf",
    stock: 56000,
    prices: [
      [1, 0.65],
      [10, 0.55],
      [100, 0.41],
    ],
    specs: {
      Channels: "2",
      GBW: "10 MHz",
      "Input Noise": "5 nV/√Hz",
      "Supply Voltage": "±3V - ±20V",
    },
    lifecycle: "Active",
  },
  {
    mpn: "USB4110-GF-A",
    manufacturer: "GCT",
    description:
      "USB Type-C receptacle, USB 2.0, 16-pin, SMT + through-hole shield",
    category: "USB Connectors",
    package: "SMT",
    datasheet_url: "https://gct.co/files/drawings/usb4110.pdf",
    stock: 7400,
    prices: [
      [1, 0.79],
      [10, 0.68],
      [100, 0.52],
    ],
    specs: {
      "Connector Type": "USB Type-C receptacle",
      "USB Spec": "2.0",
      "Current Rating": "5A",
      Mounting: "SMT",
    },
    lifecycle: "Active",
  },
];

const FORMAT_FILES: Record<string, [string, string][]> = {
  kicad: [
    ["symbol", "{mpn}.kicad_sym"],
    ["footprint", "{mpn}.kicad_mod"],
    ["step", "{mpn}.step"],
  ],
  altium: [
    ["library", "{mpn}.IntLib"],
    ["step", "{mpn}.step"],
  ],
  easyeda: [
    ["library", "{mpn}.elibz"],
    ["step", "{mpn}.step"],
  ],
  fusion360: [
    ["library", "{mpn}.f3d"],
    ["step", "{mpn}.step"],
  ],
};

export class DemoProvider extends Provider {
  readonly name = "demo";
  readonly displayName = "ComponentHub Demo Catalog (sample data)";
  readonly capabilities = new Set([
    Capability.SEARCH,
    Capability.DETAILS,
    Capability.PRICING,
    Capability.AVAILABILITY,
    Capability.DATASHEET,
    Capability.CAD_MODELS,
  ]);

  isConfigured(): boolean {
    return true;
  }

  private find(partId: string): CatalogRow {
    const row = CATALOG.find((r) => r.mpn.toLowerCase() === partId.toLowerCase());
    if (!row) throw new ProviderError(`demo: unknown part_id ${JSON.stringify(partId)}`);
    return row;
  }

  private offer(row: CatalogRow): Offer {
    const price_breaks: PriceBreak[] = row.prices.map(([quantity, unit_price]) => ({
      quantity,
      unit_price,
      currency: "USD",
    }));
    return {
      provider: this.name,
      part_id: row.mpn,
      product_url: `${baseUrl()}/api/export/demo/${row.mpn}`,
      stock: row.stock,
      price_breaks,
    };
  }

  private result(row: CatalogRow): ComponentResult {
    return {
      mpn: row.mpn,
      manufacturer: row.manufacturer,
      description: row.description,
      category: row.category,
      package: row.package,
      datasheet_url: row.datasheet_url,
      offers: [this.offer(row)],
      specifications: { ...row.specs },
    };
  }

  async search(query: SearchQuery): Promise<ComponentResult[]> {
    const terms = query.keyword.toLowerCase().split(/\s+/).filter(Boolean);
    const hits: [number, ComponentResult][] = [];
    for (const row of CATALOG) {
      const haystack = [
        row.mpn,
        row.manufacturer,
        row.description,
        row.category,
        row.package,
        ...Object.entries(row.specs).map(([k, v]) => `${k} ${v}`),
      ]
        .join(" ")
        .toLowerCase();
      const score = terms.reduce((n, t) => (haystack.includes(t) ? n + 1 : n), 0);
      // require a majority of terms to match so broad queries stay relevant
      if (terms.length && score * 2 < terms.length) continue;
      if (
        query.manufacturer &&
        !row.manufacturer.toLowerCase().includes(query.manufacturer.toLowerCase())
      )
        continue;
      if (
        query.category &&
        !row.category.toLowerCase().includes(query.category.toLowerCase())
      )
        continue;
      hits.push([score, this.result(row)]);
    }
    hits.sort((a, b) => b[0] - a[0]);
    return hits.slice(0, query.max_results).map(([, r]) => r);
  }

  async fetchDetails(partId: string): Promise<ComponentDetails> {
    const row = this.find(partId);
    return {
      ...this.result(row),
      specifications: row.specs,
      lifecycle_status: row.lifecycle,
      cad_assets: await this.fetchModels(partId),
    };
  }

  async fetchPricing(partId: string): Promise<Offer> {
    return this.offer(this.find(partId));
  }

  async fetchModels(partId: string): Promise<CadAsset[]> {
    const row = this.find(partId);
    const assets: CadAsset[] = [];
    const seen = new Set<string>();
    for (const [fmt, files] of Object.entries(FORMAT_FILES)) {
      for (const [kind, nameTpl] of files) {
        const filename = nameTpl.replace("{mpn}", row.mpn);
        if (seen.has(filename)) continue;
        seen.add(filename);
        assets.push({
          kind,
          format: kind === "step" ? "universal" : fmt,
          filename,
          url: `${baseUrl()}/api/demo-assets/${row.mpn}/${filename}`,
        });
      }
    }
    return assets;
  }

  async fetchDatasheet(partId: string): Promise<string | null> {
    return this.find(partId).datasheet_url;
  }
}

/** Placeholder file content served at /api/demo-assets/{mpn}/{filename}. */
export function demoAssetContent(mpn: string, filename: string): string | null {
  const row = CATALOG.find((r) => r.mpn.toLowerCase() === mpn.toLowerCase());
  if (!row) return null;
  return (
    `ComponentHub demo asset\n` +
    `Part: ${row.mpn} (${row.manufacturer})\n` +
    `File: ${filename}\n\n` +
    `This is sample placeholder content from the ComponentHub demo catalog.\n` +
    `Real providers serve actual CAD files here.\n`
  );
}
