"""Runtime configuration, all via environment variables."""

import os


def base_url() -> str:
    """Public base URL of this server, used to build export links."""
    return os.getenv("COMPONENTHUB_BASE_URL", "http://127.0.0.1:8000").rstrip("/")


def digikey_client_id() -> str | None:
    return os.getenv("DIGIKEY_CLIENT_ID")


def digikey_client_secret() -> str | None:
    return os.getenv("DIGIKEY_CLIENT_SECRET")


def mouser_api_key() -> str | None:
    return os.getenv("MOUSER_API_KEY")


def snapmagic_token() -> str | None:
    return os.getenv("SNAPMAGIC_TOKEN")
