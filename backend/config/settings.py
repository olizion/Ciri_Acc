"""
Application Settings
Environment-based configuration with Pydantic
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # App
    app_name: str = "Ciri"
    debug: bool = False
    secret_key: str = "change-me-in-production"

    # Database
    database_url: str = "postgresql+asyncpg://ciri:ciri@localhost:5432/ciri"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Authentication
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60
    jwt_refresh_token_expire_days: int = 7

    # CORS - allow all local development origins
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://0.0.0.0:3000",
        "https://ciri.no",
    ]

    # Outbound email (weekly summaries, notifications)
    # Resend (recommended) — or SMTP fallback
    resend_key: str = ""
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "ciri@ciri.no"
    smtp_from_name: str = "Ciri Regnskapsfører"

    # AI
    anthropic_api_key: str = ""

    # Fixer.io (Currency Exchange Rates)
    fixer_api_key: str = ""

    # Ollama (local LLM)
    ollama_host: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5vl:7b"

    # External APIs
    brreg_api_url: str = "https://data.brreg.no/enhetsregisteret/api"
    altinn_api_url: str = "https://platform.altinn.no/api"

    # =======================================================================
    # MASKINPORTEN CONFIGURATION
    # Get credentials from: https://samarbeid.digdir.no
    # Documentation: https://docs.digdir.no/docs/Maskinporten/
    # =======================================================================

    # Environment: "test" or "prod"
    maskinporten_env: str = "test"

    # Your client ID from Samarbeidsportalen
    # Test: Created in "Ver 2" environment
    # Prod: Created in production environment
    maskinporten_client_id: str = ""

    # Path to your virksomhetssertifikat (enterprise certificate) private key
    # Format: PEM file containing the private key
    # Get certificate from: Buypass or Commfides
    maskinporten_private_key_path: str = "./certs/private_key.pem"

    # Or provide the key directly as a string (base64 encoded)
    maskinporten_private_key_base64: str = ""

    # Your organization number (9 digits)
    maskinporten_issuer: str = ""

    # Key ID (kid) from Samarbeidsportalen — required in JWT header
    maskinporten_kid: str = ""

    # =======================================================================
    # ALTINN SYSTEM USER CONFIGURATION
    # Required for Skatteetaten APIs that mandate authorization_details
    # Register system at: https://altinn.no/ui/SystemUser
    # =======================================================================

    # System user UUID from Altinn (created by org admin)
    altinn_systemuser_id: str = ""

    # System identifier (format: "{org_number}_{system_name}")
    altinn_system_id: str = ""

    # =======================================================================
    # SKATTEETATEN API CONFIGURATION
    # Apply for access: https://skatteetaten.github.io/api-dokumentasjon/
    # =======================================================================

    # Scopes to request
    skatteetaten_scopes: str = "skatteetaten:skattekorttilarbeidsgiver"

    # =======================================================================
    # FOLKEREGISTERET (POPULATION REGISTRY) - Optional
    # Requires special approval from Skatteetaten
    # =======================================================================

    folkeregister_enabled: bool = False
    folkeregister_scopes: str = "folkeregister:deling/offentligmedhjemmel"

    # Encryption
    encryption_key: str = "change-me-32-byte-key-for-aes256"

    # Storage
    upload_dir: str = "./uploads"
    max_upload_size_mb: int = 50

    # =======================================================================
    # EMAIL MONITORING CONFIGURATION
    # For automatic invoice/receipt ingestion from email
    # =======================================================================

    # Provider: "postmark", "sendgrid", or "imap"
    email_provider: str = "postmark"

    # Inbound email address (e.g., bilag@inbound.yourcompany.com)
    email_inbound_address: str = ""

    # Company name to match in emails
    company_name: str = ""

    # Postmark settings
    postmark_server_token: str = ""
    postmark_inbound_token: str = ""

    # SendGrid settings (if using SendGrid)
    sendgrid_api_key: str = ""

    # =======================================================================
    # OAUTH EMAIL INTEGRATION
    # For automatic invoice ingestion from Gmail/Outlook
    # =======================================================================

    # Backend URL for OAuth callbacks
    backend_url: str = "http://localhost:8000"
    # Frontend URL for redirects
    frontend_url: str = "http://localhost:3000"

    # Google OAuth (from console.cloud.google.com)
    # 1. Create OAuth 2.0 credentials
    # 2. Add authorized redirect URI: {backend_url}/api/email/oauth/google/callback
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""  # Optional, defaults to backend_url + path

    # Microsoft OAuth (from portal.azure.com)
    # 1. Register app in Azure AD
    # 2. Add API permissions: Mail.Read, User.Read
    # 3. Add redirect URI: {backend_url}/api/email/oauth/microsoft/callback
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    microsoft_tenant_id: str = "common"  # "common" for multi-tenant, or specific tenant ID
    microsoft_redirect_uri: str = ""  # Optional, defaults to backend_url + path

    # =======================================================================
    # DIRECT BANK INTEGRATION CONFIGURATION
    # Connect directly to Norwegian bank APIs (PSD2) without third-party aggregators
    #
    # Supported banks:
    # - DNB: https://developer.dnb.no
    # - Nordea: https://developer.nordeaopenbanking.com
    # - SpareBank 1: https://www.sparebank1.no/nb/bank/bedrift/open-api.html
    # =======================================================================

    # Use sandbox/test mode for development
    bank_sandbox_mode: bool = True

    # Sync settings
    bank_sync_interval_hours: int = 4  # How often to sync (PSD2 allows 4x daily)
    bank_transaction_lookback_days: int = 90  # How far back to fetch on first sync

    # Redirect URI for all bank authorizations
    # Must be registered with each bank's developer portal
    bank_redirect_uri: str = ""  # Defaults to {backend_url}/api/bank/callback

    # -----------------------------------------------------------------------
    # DNB - Norway's largest bank (54% market share)
    # Register at: https://developer.dnb.no
    # -----------------------------------------------------------------------
    dnb_client_id: str = ""
    dnb_client_secret: str = ""
    # eIDAS certificates (required for production)
    dnb_certificate_path: str = ""  # Path to QSEALC certificate
    dnb_key_path: str = ""  # Path to private key

    # -----------------------------------------------------------------------
    # NORDEA - Nordic bank (10% market share in Norway)
    # Register at: https://developer.nordeaopenbanking.com
    # -----------------------------------------------------------------------
    nordea_client_id: str = ""
    nordea_client_secret: str = ""
    # eIDAS certificates (required for production)
    nordea_certificate_path: str = ""
    nordea_key_path: str = ""

    # -----------------------------------------------------------------------
    # SPAREBANK 1 - Alliance of regional banks (15% combined market share)
    # Register at: https://www.sparebank1.no/nb/bank/bedrift/open-api.html
    # Same credentials work for all SpareBank 1 regional banks
    # -----------------------------------------------------------------------
    sparebank1_client_id: str = ""
    sparebank1_client_secret: str = ""

    # =======================================================================
    # GOCARDLESS BANK ACCOUNT DATA (FREE - RECOMMENDED)
    # No eIDAS certificate required! Covers 2,500+ European banks.
    # Get credentials: https://bankaccountdata.gocardless.com/user-secrets/
    #
    # Free tier: 50 bank connections/month, 4 syncs/day
    # Includes all major Norwegian banks: DNB, Nordea, SpareBank 1, etc.
    # =======================================================================

    # Secret ID and Key from GoCardless dashboard
    gocardless_secret_id: str = ""
    gocardless_secret_key: str = ""

    # Redirect URI for bank authorization
    gocardless_redirect_uri: str = ""  # Defaults to {backend_url}/api/bank/callback

    # API base URL
    gocardless_base_url: str = "https://bankaccountdata.gocardless.com/api/v2"

    # =======================================================================
    # TINK OPEN BANKING (BY VISA) - RECOMMENDED
    # European open banking platform with 6000+ bank connections
    # Supports Norwegian banks including SpareBank 1 SR-Bank
    # Get credentials: https://console.tink.com/
    # Documentation: https://docs.tink.com/
    # =======================================================================

    # Client credentials from Tink Console
    tink_client_id: str = ""
    tink_client_secret: str = ""

    # Redirect URI for bank authorization
    tink_redirect_uri: str = ""  # Defaults to {backend_url}/api/bank/tink/callback

    # =======================================================================
    # ROARING.IO OPEN BANKING (SANDBOX-FRIENDLY)
    # European bank account data API with working Mock ASPSP for Norway.
    # Get credentials: https://app.roaring.io/
    # =======================================================================

    roaring_client_id: str = ""
    roaring_client_secret: str = ""

    # API base URL
    roaring_base_url: str = "https://api.roaring.io/global/bank-account-data/1.0"

    # =======================================================================
    # LEGACY: NEONOMICS OPEN BANKING (AGGREGATOR)
    # Alternative to direct bank integrations
    # Get credentials from: https://developer.neonomics.io
    # =======================================================================

    # Environment: "sandbox" or "production"
    neonomics_environment: str = "sandbox"

    # OAuth credentials from Neonomics dashboard
    neonomics_client_id: str = ""
    neonomics_client_secret: str = ""

    # Redirect URI for bank authorization
    neonomics_redirect_uri: str = ""  # Defaults to {backend_url}/api/bank/callback

    # API base URLs (automatically set based on environment)
    @property
    def neonomics_api_url(self) -> str:
        if self.neonomics_environment == "production":
            return "https://api.neonomics.io/v1"
        return "https://sandbox.neonomics.io/v1"

    @property
    def neonomics_auth_url(self) -> str:
        if self.neonomics_environment == "production":
            return "https://auth.neonomics.io"
        return "https://sandbox-auth.neonomics.io"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
