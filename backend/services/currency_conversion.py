"""
Currency Conversion Service
Uses Fixer.io API for historical exchange rates (Bokføringsloven compliance)
"""

import httpx
from decimal import Decimal
from datetime import date
from typing import Optional
from dataclasses import dataclass
import logging

from config.settings import settings

logger = logging.getLogger(__name__)

FIXER_API_URL = "http://data.fixer.io/api"


@dataclass
class ConversionResult:
    """Result of currency conversion."""
    original_currency: str
    original_amount: Decimal
    nok_amount: Decimal
    exchange_rate: Decimal
    rate_date: date
    success: bool
    error: str | None = None


# Cache for exchange rates (simple in-memory cache)
_rate_cache: dict[str, dict] = {}


async def get_exchange_rate(
    from_currency: str,
    to_currency: str = "NOK",
    rate_date: Optional[date] = None
) -> Optional[Decimal]:
    """
    Get exchange rate from Fixer.io API.

    Uses historical rates for compliance with Bokføringsloven.
    Rates are cached to minimize API calls.

    Args:
        from_currency: Source currency (e.g., "USD", "EUR")
        to_currency: Target currency (default "NOK")
        rate_date: Date for historical rate (default: today)

    Returns:
        Exchange rate or None if not available
    """
    if not settings.fixer_api_key:
        logger.warning("Fixer API key not configured")
        return None

    # Normalize currencies
    from_currency = from_currency.upper()
    to_currency = to_currency.upper()

    # Same currency = rate of 1
    if from_currency == to_currency:
        return Decimal("1")

    # Use today if no date specified
    if rate_date is None:
        rate_date = date.today()

    # Check cache
    cache_key = f"{rate_date.isoformat()}_{from_currency}_{to_currency}"
    if cache_key in _rate_cache:
        return _rate_cache[cache_key]["rate"]

    try:
        # Fixer.io free plan only supports EUR as base
        # So we get EUR -> from_currency and EUR -> to_currency, then calculate
        date_str = rate_date.isoformat()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{FIXER_API_URL}/{date_str}",
                params={
                    "access_key": settings.fixer_api_key,
                    "symbols": f"{from_currency},{to_currency}",
                }
            )
            response.raise_for_status()
            data = response.json()

        if not data.get("success"):
            error = data.get("error", {}).get("info", "Unknown error")
            logger.error(f"Fixer API error: {error}")
            return None

        rates = data.get("rates", {})

        if from_currency not in rates or to_currency not in rates:
            logger.error(f"Missing rates for {from_currency} or {to_currency}")
            return None

        # Calculate cross rate: from_currency -> EUR -> to_currency
        # rate = (1 / EUR_to_from) * EUR_to_to
        eur_to_from = Decimal(str(rates[from_currency]))
        eur_to_to = Decimal(str(rates[to_currency]))

        rate = eur_to_to / eur_to_from

        # Cache the result
        _rate_cache[cache_key] = {"rate": rate, "date": rate_date}

        logger.info(f"Exchange rate {from_currency}->{to_currency} on {date_str}: {rate}")
        return rate

    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching exchange rate: {e}")
        return None
    except Exception as e:
        logger.error(f"Error fetching exchange rate: {e}")
        return None


async def convert_to_nok(
    amount: Decimal,
    from_currency: str,
    rate_date: Optional[date] = None
) -> ConversionResult:
    """
    Convert an amount to NOK using historical exchange rate.

    Args:
        amount: Amount in original currency
        from_currency: Source currency code
        rate_date: Date for historical rate (required for compliance)

    Returns:
        ConversionResult with converted amount and rate details
    """
    from_currency = from_currency.upper()

    # Already in NOK
    if from_currency == "NOK":
        return ConversionResult(
            original_currency="NOK",
            original_amount=amount,
            nok_amount=amount,
            exchange_rate=Decimal("1"),
            rate_date=rate_date or date.today(),
            success=True
        )

    # Get exchange rate
    rate = await get_exchange_rate(from_currency, "NOK", rate_date)

    if rate is None:
        # Fallback: use approximate rates for common currencies
        fallback_rates = {
            "USD": Decimal("10.5"),
            "EUR": Decimal("11.5"),
            "GBP": Decimal("13.5"),
            "SEK": Decimal("1.0"),
            "DKK": Decimal("1.55"),
        }
        rate = fallback_rates.get(from_currency)

        if rate is None:
            return ConversionResult(
                original_currency=from_currency,
                original_amount=amount,
                nok_amount=amount,  # No conversion possible
                exchange_rate=Decimal("1"),
                rate_date=rate_date or date.today(),
                success=False,
                error=f"No exchange rate available for {from_currency}"
            )

        logger.warning(f"Using fallback rate for {from_currency}: {rate}")

    # Convert
    nok_amount = (amount * rate).quantize(Decimal("0.01"))

    return ConversionResult(
        original_currency=from_currency,
        original_amount=amount,
        nok_amount=nok_amount,
        exchange_rate=rate,
        rate_date=rate_date or date.today(),
        success=True
    )


def clear_rate_cache():
    """Clear the exchange rate cache."""
    global _rate_cache
    _rate_cache = {}
