"""
Bank Integration Service

Four integration modes:

1. ROARING.IO (Sandbox-friendly) - Working Mock ASPSP for Norway
   - Get credentials: https://app.roaring.io/
   - Mock ASPSP sandbox with real test transaction data
   - Best for development and end-to-end testing

2. TINK (Recommended for production) - By Visa, 6000+ bank connections
   - Get credentials: https://console.tink.com/
   - Supports Norwegian banks including SpareBank 1 SR-Bank
   - Business accounts supported (Enterprise)

3. GOCARDLESS - FREE (NOTE: Sunsetting, no new signups as of late 2025)
   - Get credentials: https://bankaccountdata.gocardless.com/user-secrets/
   - Free tier: 50 bank connections/month, 4 syncs/day
   - Covers 2,500+ European banks including all major Norwegian banks

4. DIRECT - Requires eIDAS QSealC certificate (~NOK 50,000 + Finanstilsynet license)
   - DNB (54% market share) - developer.dnb.no
   - SpareBank 1 (15% combined) - api.sparebank1.no
   - Nordea (10%) - developer.nordeaopenbanking.com

All integrations return data in Berlin Group NextGenPSD2 format.
"""

from .base import (
    BankAdapter,
    BankInfo,
    BankAccountInfo,
    BankTransactionInfo,
    BankBalance,
    BankError,
    AuthorizationResult,
)
from .manager import BankManager, bank_manager, KontoutskriftExport

# Roaring.io (Sandbox-friendly - Mock ASPSP)
from .roaring import (
    RoaringClient,
    RoaringAdapter,
    RoaringBank,
    get_roaring_client,
    get_norwegian_banks_roaring,
)

# Tink (Recommended for production - by Visa)
from .tink import (
    TinkClient,
    TinkAdapter,
    TinkProvider,
    get_tink_client,
    get_norwegian_banks_tink,
    create_tink_adapter,
)

# GoCardless (FREE but sunsetting)
from .gocardless import (
    GoCardlessClient,
    GoCardlessAdapter,
    GoCardlessInstitution,
    RequisitionDto,
    get_gocardless_client,
    get_norwegian_banks,
    create_bank_adapter as create_gocardless_adapter,
)

# Direct bank integrations (require eIDAS certificates)
from .dnb import DNBAdapter
from .nordea import NordeaAdapter
from .sparebank1 import SpareBank1Adapter

__all__ = [
    # Base classes
    "BankAdapter",
    "BankInfo",
    "BankAccountInfo",
    "BankTransactionInfo",
    "BankBalance",
    "BankError",
    "AuthorizationResult",
    "KontoutskriftExport",
    # Manager
    "BankManager",
    "bank_manager",
    # Roaring.io (Sandbox-friendly)
    "RoaringClient",
    "RoaringAdapter",
    "RoaringBank",
    "get_roaring_client",
    "get_norwegian_banks_roaring",
    # Tink (Recommended for production)
    "TinkClient",
    "TinkAdapter",
    "TinkProvider",
    "get_tink_client",
    "get_norwegian_banks_tink",
    "create_tink_adapter",
    # GoCardless (sunsetting)
    "GoCardlessClient",
    "GoCardlessAdapter",
    "GoCardlessInstitution",
    "RequisitionDto",
    "get_gocardless_client",
    "get_norwegian_banks",
    "create_gocardless_adapter",
    # Direct adapters
    "DNBAdapter",
    "NordeaAdapter",
    "SpareBank1Adapter",
]
