"""Shared data models. Normalization is in-memory per request — nothing is stored."""

from enum import Enum

from pydantic import BaseModel, Field


class Capability(str, Enum):
    SEARCH = "search"
    DETAILS = "details"
    PRICING = "pricing"
    AVAILABILITY = "availability"
    DATASHEET = "datasheet"
    CAD_MODELS = "cad_models"


class ExportFormat(str, Enum):
    KICAD = "kicad"
    ALTIUM = "altium"
    EASYEDA = "easyeda"
    FUSION360 = "fusion360"


class SearchQuery(BaseModel):
    keyword: str
    manufacturer: str | None = None
    category: str | None = None
    in_stock_only: bool = False
    max_results: int = 10


class PriceBreak(BaseModel):
    quantity: int
    unit_price: float
    currency: str = "USD"


class Offer(BaseModel):
    """One provider's listing of a component."""

    provider: str
    part_id: str = Field(description="Provider-specific identifier, used for detail lookups")
    product_url: str | None = None
    stock: int | None = None
    price_breaks: list[PriceBreak] = []
    packaging: str | None = None


class ComponentResult(BaseModel):
    """A component, possibly merged from several providers (matched by MPN)."""

    mpn: str
    manufacturer: str | None = None
    description: str | None = None
    category: str | None = None
    package: str | None = None
    datasheet_url: str | None = None
    image_url: str | None = None
    offers: list[Offer] = []


class CadAsset(BaseModel):
    kind: str = Field(description="symbol | footprint | step | library | datasheet")
    format: str = Field(description="kicad | altium | easyeda | fusion360 | universal")
    filename: str
    url: str


class ComponentDetails(ComponentResult):
    specifications: dict[str, str] = {}
    lifecycle_status: str | None = None
    cad_assets: list[CadAsset] = []
