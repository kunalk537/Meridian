"""Built-in demo provider with a small static catalog.

Lets the server work end-to-end (search → details → export link → download)
without any API keys. Clearly labeled so the LLM can tell users the data is
sample data, not live distributor inventory.
"""

from .. import config
from ..models import (
    CadAsset,
    Capability,
    ComponentDetails,
    ComponentResult,
    Offer,
    PriceBreak,
    SearchQuery,
)
from .base import Provider, ProviderError

_CATALOG: list[dict] = [
    {
        "mpn": "ESP32-S3-WROOM-1-N8",
        "manufacturer": "Espressif Systems",
        "description": "ESP32-S3 Wi-Fi + Bluetooth 5 LE module, 8MB flash, USB OTG, SMD",
        "category": "RF Modules / MCU",
        "package": "SMD Module",
        "datasheet_url": "https://www.espressif.com/sites/default/files/documentation/esp32-s3-wroom-1_wroom-1u_datasheet_en.pdf",
        "stock": 15400,
        "prices": [(1, 2.95), (10, 2.70), (100, 2.38)],
        "specs": {
            "Core": "Xtensa dual-core LX7 @ 240MHz",
            "Flash": "8 MB",
            "PSRAM": "None",
            "Wi-Fi": "802.11 b/g/n",
            "Bluetooth": "5.0 LE",
            "USB": "USB OTG 1.1",
            "Operating Voltage": "3.0V - 3.6V",
        },
        "lifecycle": "Active",
    },
    {
        "mpn": "ESP32-C6-WROOM-1-N8",
        "manufacturer": "Espressif Systems",
        "description": "ESP32-C6 Wi-Fi 6 + Bluetooth 5 LE + 802.15.4 module, 8MB flash, SMD",
        "category": "RF Modules / MCU",
        "package": "SMD Module",
        "datasheet_url": "https://www.espressif.com/sites/default/files/documentation/esp32-c6-wroom-1_wroom-1u_datasheet_en.pdf",
        "stock": 9800,
        "prices": [(1, 2.60), (10, 2.40), (100, 2.10)],
        "specs": {
            "Core": "RISC-V single-core @ 160MHz",
            "Flash": "8 MB",
            "Wi-Fi": "802.11 ax (Wi-Fi 6)",
            "Bluetooth": "5.3 LE",
            "802.15.4": "Zigbee / Thread",
            "USB": "USB Serial/JTAG",
            "Operating Voltage": "3.0V - 3.6V",
        },
        "lifecycle": "Active",
    },
    {
        "mpn": "STM32F405RGT6",
        "manufacturer": "STMicroelectronics",
        "description": "ARM Cortex-M4 MCU 168MHz, 1MB flash, 192KB RAM, USB OTG, LQFP-64",
        "category": "Microcontrollers",
        "package": "LQFP-64",
        "datasheet_url": "https://www.st.com/resource/en/datasheet/stm32f405rg.pdf",
        "stock": 3200,
        "prices": [(1, 8.90), (10, 8.10), (100, 7.05)],
        "specs": {
            "Core": "ARM Cortex-M4F @ 168MHz",
            "Flash": "1 MB",
            "RAM": "192 KB",
            "USB": "OTG FS + HS",
            "Operating Voltage": "1.8V - 3.6V",
        },
        "lifecycle": "Active",
    },
    {
        "mpn": "LM2596S-5.0",
        "manufacturer": "Texas Instruments",
        "description": "4.5V-40V input, 5V 3A step-down (buck) voltage regulator, TO-263",
        "category": "Voltage Regulators - DC DC Switching",
        "package": "TO-263-5",
        "datasheet_url": "https://www.ti.com/lit/ds/symlink/lm2596.pdf",
        "stock": 22100,
        "prices": [(1, 1.85), (10, 1.62), (100, 1.31)],
        "specs": {
            "Input Voltage": "4.5V - 40V",
            "Output Voltage": "5V fixed",
            "Output Current": "3A",
            "Topology": "Buck",
            "Switching Frequency": "150 kHz",
        },
        "lifecycle": "Active",
    },
    {
        "mpn": "TPS54331DR",
        "manufacturer": "Texas Instruments",
        "description": "3.5V-28V input, 3A step-down converter with Eco-mode, SOIC-8",
        "category": "Voltage Regulators - DC DC Switching",
        "package": "SOIC-8",
        "datasheet_url": "https://www.ti.com/lit/ds/symlink/tps54331.pdf",
        "stock": 41000,
        "prices": [(1, 0.98), (10, 0.84), (100, 0.62)],
        "specs": {
            "Input Voltage": "3.5V - 28V",
            "Output Voltage": "0.8V - 25V adjustable",
            "Output Current": "3A",
            "Topology": "Buck",
            "Switching Frequency": "570 kHz",
        },
        "lifecycle": "Active",
    },
    {
        "mpn": "AMS1117-3.3",
        "manufacturer": "Advanced Monolithic Systems",
        "description": "1A low dropout linear regulator, 3.3V fixed, SOT-223",
        "category": "Voltage Regulators - Linear (LDO)",
        "package": "SOT-223",
        "datasheet_url": "http://www.advanced-monolithic.com/pdf/ds1117.pdf",
        "stock": 180000,
        "prices": [(1, 0.12), (10, 0.09), (100, 0.05)],
        "specs": {
            "Output Voltage": "3.3V fixed",
            "Output Current": "1A",
            "Dropout": "1.3V @ 1A",
        },
        "lifecycle": "Active",
    },
    {
        "mpn": "NE5532P",
        "manufacturer": "Texas Instruments",
        "description": "Dual low-noise operational amplifier, 10MHz GBW, DIP-8",
        "category": "Operational Amplifiers",
        "package": "DIP-8",
        "datasheet_url": "https://www.ti.com/lit/ds/symlink/ne5532.pdf",
        "stock": 56000,
        "prices": [(1, 0.65), (10, 0.55), (100, 0.41)],
        "specs": {
            "Channels": "2",
            "GBW": "10 MHz",
            "Input Noise": "5 nV/√Hz",
            "Supply Voltage": "±3V - ±20V",
        },
        "lifecycle": "Active",
    },
    {
        "mpn": "USB4110-GF-A",
        "manufacturer": "GCT",
        "description": "USB Type-C receptacle, USB 2.0, 16-pin, SMT + through-hole shield",
        "category": "USB Connectors",
        "package": "SMT",
        "datasheet_url": "https://gct.co/files/drawings/usb4110.pdf",
        "stock": 7400,
        "prices": [(1, 0.79), (10, 0.68), (100, 0.52)],
        "specs": {
            "Connector Type": "USB Type-C receptacle",
            "USB Spec": "2.0",
            "Current Rating": "5A",
            "Mounting": "SMT",
        },
        "lifecycle": "Active",
    },
]

_FORMAT_FILES: dict[str, list[tuple[str, str]]] = {
    "kicad": [("symbol", "{mpn}.kicad_sym"), ("footprint", "{mpn}.kicad_mod"), ("step", "{mpn}.step")],
    "altium": [("library", "{mpn}.IntLib"), ("step", "{mpn}.step")],
    "easyeda": [("library", "{mpn}.elibz"), ("step", "{mpn}.step")],
    "fusion360": [("library", "{mpn}.f3d"), ("step", "{mpn}.step")],
}


class DemoProvider(Provider):
    name = "demo"
    display_name = "ComponentHub Demo Catalog (sample data)"
    capabilities = frozenset(
        {
            Capability.SEARCH,
            Capability.DETAILS,
            Capability.PRICING,
            Capability.AVAILABILITY,
            Capability.DATASHEET,
            Capability.CAD_MODELS,
        }
    )

    def is_configured(self) -> bool:
        return True

    def _find(self, part_id: str) -> dict:
        for row in _CATALOG:
            if row["mpn"].lower() == part_id.lower():
                return row
        raise ProviderError(f"demo: unknown part_id {part_id!r}")

    def _offer(self, row: dict) -> Offer:
        return Offer(
            provider=self.name,
            part_id=row["mpn"],
            product_url=f"{config.base_url()}/export/demo/{row['mpn']}",
            stock=row["stock"],
            price_breaks=[PriceBreak(quantity=q, unit_price=p) for q, p in row["prices"]],
        )

    def _result(self, row: dict) -> ComponentResult:
        return ComponentResult(
            mpn=row["mpn"],
            manufacturer=row["manufacturer"],
            description=row["description"],
            category=row["category"],
            package=row["package"],
            datasheet_url=row["datasheet_url"],
            offers=[self._offer(row)],
        )

    async def search(self, query: SearchQuery) -> list[ComponentResult]:
        terms = [t for t in query.keyword.lower().split() if t]
        hits: list[tuple[int, ComponentResult]] = []
        for row in _CATALOG:
            haystack = " ".join(
                [row["mpn"], row["manufacturer"], row["description"], row["category"], row["package"]]
                + [f"{k} {v}" for k, v in row["specs"].items()]
            ).lower()
            score = sum(1 for t in terms if t in haystack)
            # require a majority of terms to match so broad queries stay relevant
            if terms and score * 2 < len(terms):
                continue
            if query.manufacturer and query.manufacturer.lower() not in row["manufacturer"].lower():
                continue
            if query.category and query.category.lower() not in row["category"].lower():
                continue
            hits.append((score, self._result(row)))
        hits.sort(key=lambda h: -h[0])
        return [r for _, r in hits[: query.max_results]]

    async def fetch_details(self, part_id: str) -> ComponentDetails:
        row = self._find(part_id)
        base = self._result(row)
        return ComponentDetails(
            **base.model_dump(),
            specifications=row["specs"],
            lifecycle_status=row["lifecycle"],
            cad_assets=await self.fetch_models(part_id),
        )

    async def fetch_pricing(self, part_id: str) -> Offer:
        return self._offer(self._find(part_id))

    async def fetch_models(self, part_id: str) -> list[CadAsset]:
        row = self._find(part_id)
        assets = []
        for fmt, files in _FORMAT_FILES.items():
            for kind, name_tpl in files:
                filename = name_tpl.format(mpn=row["mpn"])
                assets.append(
                    CadAsset(
                        kind=kind,
                        format=fmt if kind != "step" else "universal",
                        filename=filename,
                        url=f"{config.base_url()}/demo-assets/{row['mpn']}/{filename}",
                    )
                )
        # de-dupe the universal STEP entries added once per format
        seen: set[str] = set()
        unique = [a for a in assets if not (a.filename in seen or seen.add(a.filename))]
        return unique

    async def fetch_datasheet(self, part_id: str) -> str | None:
        return self._find(part_id)["datasheet_url"]


def demo_asset_content(mpn: str, filename: str) -> str | None:
    """Generate placeholder file content served at /demo-assets/{mpn}/{filename}."""
    for row in _CATALOG:
        if row["mpn"].lower() == mpn.lower():
            return (
                f"ComponentHub demo asset\n"
                f"Part: {row['mpn']} ({row['manufacturer']})\n"
                f"File: {filename}\n\n"
                f"This is sample placeholder content from the ComponentHub demo catalog.\n"
                f"Real providers serve actual CAD files here.\n"
            )
    return None
