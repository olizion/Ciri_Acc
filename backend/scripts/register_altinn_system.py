"""
Register Ciri as a system in Altinn's System Register.

This script:
1. Gets a Maskinporten token with scope altinn:authentication/systemregister.write
2. POSTs to Altinn's system register to register Ciri

Usage: python scripts/register_altinn_system.py
"""

import base64
import json
import time
import uuid
from pathlib import Path

import httpx
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend


# === Configuration ===
MASKINPORTEN_ENV = "test"
MASKINPORTEN_CLIENT_ID = "9fc65f37-18ab-43ab-8288-9fae06194943"
MASKINPORTEN_KID = "51d7bab1-0ba1-4ba9-b052-fb5207f3d0da"
MASKINPORTEN_ISSUER = "927185695"
PRIVATE_KEY_PATH = Path(__file__).parent.parent / "certs" / "private_key.pem"

# Maskinporten test endpoints
MASKINPORTEN_TOKEN_URL = "https://test.maskinporten.no/token"
MASKINPORTEN_AUD = "https://test.maskinporten.no/"

# Altinn test endpoint
ALTINN_BASE = "https://platform.tt02.altinn.no"
ALTINN_REGISTER_URL = f"{ALTINN_BASE}/authentication/api/v1/systemregister/vendor"

# Scope needed for system register
SCOPE = "altinn:authentication/systemregister.write"


def load_private_key():
    with open(PRIVATE_KEY_PATH, "rb") as f:
        return serialization.load_pem_private_key(
            f.read(), password=None, backend=default_backend()
        )


def create_jwt_assertion(scope: str) -> str:
    now = int(time.time())
    payload = {
        "aud": MASKINPORTEN_AUD,
        "iss": MASKINPORTEN_CLIENT_ID,
        "scope": scope,
        "iat": now,
        "exp": now + 120,
        "jti": str(uuid.uuid4()),
        "consumer_org": MASKINPORTEN_ISSUER,
    }

    private_key = load_private_key()
    private_key_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    return jwt.encode(
        payload, private_key_pem, algorithm="RS256", headers={"kid": MASKINPORTEN_KID}
    )


def get_maskinporten_token(scope: str) -> str:
    assertion = create_jwt_assertion(scope)

    response = httpx.post(
        MASKINPORTEN_TOKEN_URL,
        data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    if response.status_code != 200:
        print(f"ERROR: Maskinporten token request failed ({response.status_code})")
        print(f"Response: {response.text}")
        raise SystemExit(1)

    data = response.json()
    print(f"Got Maskinporten token (expires in {data.get('expires_in')}s)")
    return data["access_token"]


def register_system(token: str):
    system_payload = {
        "id": f"{MASKINPORTEN_ISSUER}_ciri",
        "vendor": {
            "authority": "iso6523-actorid-upis",
            "ID": f"0192:{MASKINPORTEN_ISSUER}",
        },
        "name": {
            "nb": "Ciri Regnskapssystem",
            "en": "Ciri Accounting System",
            "nn": "Ciri Rekneskapsystem",
        },
        "description": {
            "nb": "AI-drevet regnskapssystem for norske småbedrifter",
            "en": "AI-powered accounting system for Norwegian small businesses",
            "nn": "AI-driven rekneskapsystem for norske småbedrifter",
        },
        "rights": [
            {
                "resource": [
                    {
                        "id": "urn:altinn:resource",
                        "value": "ske-skattekort-til-arbeidsgiver",
                    }
                ]
            }
        ],
        "clientId": [MASKINPORTEN_CLIENT_ID],
        "allowedredirecturls": ["https://localhost:3000"],
        "isVisible": True,
    }

    print(f"\nRegistering system at: {ALTINN_REGISTER_URL}")
    print(f"System ID: {system_payload['id']}")
    print(f"Payload:\n{json.dumps(system_payload, indent=2, ensure_ascii=False)}\n")

    response = httpx.post(
        ALTINN_REGISTER_URL,
        json=system_payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        timeout=30.0,
    )

    print(f"Response status: {response.status_code}")
    print(f"Response body:\n{json.dumps(response.json(), indent=2, ensure_ascii=False) if response.headers.get('content-type', '').startswith('application/json') else response.text}")

    if response.status_code in (200, 201):
        print("\nSUCCESS: System registered in Altinn!")
        return response.json()
    else:
        print(f"\nFAILED: Registration failed with status {response.status_code}")
        return None


def main():
    print("=== Altinn System Registration for Ciri ===\n")

    # Step 1: Get token
    print("Step 1: Getting Maskinporten token...")
    token = get_maskinporten_token(SCOPE)

    # Step 2: Register system
    print("\nStep 2: Registering system in Altinn...")
    result = register_system(token)

    if result:
        print("\n=== Next Steps ===")
        print("1. Create a system user request (run register_systemuser.py)")
        print("2. Approve it in Altinn")
        print("3. Retrieve the systemuser_id")


if __name__ == "__main__":
    main()
