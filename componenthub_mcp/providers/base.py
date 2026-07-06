"""Capability-based provider connector interface.

A provider isn't a website — it's a set of capabilities. The coordinator asks
"who can answer this part of the request?" and only calls providers that
declare (and are configured for) the needed capability.
"""

from abc import ABC, abstractmethod

from ..models import CadAsset, Capability, ComponentDetails, Offer, SearchQuery, ComponentResult


class ProviderError(Exception):
    """Raised by connectors on upstream/API failures; reported per-provider, never fatal."""


class Provider(ABC):
    name: str
    display_name: str
    capabilities: frozenset[Capability]

    @abstractmethod
    def is_configured(self) -> bool:
        """True when required credentials (if any) are present."""

    def missing_config(self) -> str | None:
        """Human-readable hint about what's needed to enable this provider."""
        return None

    async def search(self, query: SearchQuery) -> list[ComponentResult]:
        raise ProviderError(f"{self.name} does not support search")

    async def fetch_details(self, part_id: str) -> ComponentDetails:
        raise ProviderError(f"{self.name} does not support details")

    async def fetch_pricing(self, part_id: str) -> Offer:
        raise ProviderError(f"{self.name} does not support pricing")

    async def fetch_models(self, part_id: str) -> list[CadAsset]:
        raise ProviderError(f"{self.name} does not support CAD models")

    async def fetch_datasheet(self, part_id: str) -> str | None:
        raise ProviderError(f"{self.name} does not support datasheets")
