"""Provider registry. Add a new connector by appending it to _PROVIDERS."""

from .base import Provider, ProviderError
from .demo import DemoProvider
from .digikey import DigiKeyProvider
from .mouser import MouserProvider
from .snapmagic import SnapMagicProvider

_PROVIDERS: dict[str, Provider] = {
    p.name: p
    for p in (DemoProvider(), DigiKeyProvider(), MouserProvider(), SnapMagicProvider())
}


def all_providers() -> dict[str, Provider]:
    return _PROVIDERS


def get_provider(name: str) -> Provider:
    provider = _PROVIDERS.get(name.lower())
    if provider is None:
        raise ProviderError(
            f"Unknown provider {name!r}. Available: {', '.join(sorted(_PROVIDERS))}"
        )
    return provider


__all__ = ["Provider", "ProviderError", "all_providers", "get_provider"]
