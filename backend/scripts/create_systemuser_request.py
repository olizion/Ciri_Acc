"""
Create a System User Request in Altinn for Ciri.

After running this, someone with admin rights for the org must
open the confirmUrl and approve the request.

Usage: python scripts/create_systemuser_request.py
"""

import json
import time
import uuid
from pathlib import Path

import httpx
import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend


# === Configuration ===
MASKINPORTEN_CLIENT_ID = "9fc65f37-18ab-43ab-8288-9fae06194943"
MASKINPORTEN_KID = "51d7bab1-0ba1-4ba9-b052-fb5207f3d0da"
MASKINPORTEN_ISSUER = "927185695"
PRIVATE_KEY_PATH = Path(__file__).parent.parent / "certs" / "private_key.pem"

MASKINPORTEN_TOKEN_URL = "https://test.maskinporten.no/token"
MASKINPORTEN_AUD = "https://test.maskinporten.no/"

ALTINN_BASE = "https://platform.tt02.altinn.no"

# System ID from registration step
SYSTEM_ID = f"{MASKINPORTEN_ISSUER}_ciri"

# Scope for system user management
SCOPE = "altinn:authentication/systemuser.request.write"


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


def create_systemuser_request(token: str):
    url = f"{ALTINN_BASE}/authentication/api/v1/systemuser/request/vendor"

    request_payload = {
        "systemId": SYSTEM_ID,
        "partyOrgNo": MASKINPORTEN_ISSUER,
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
        "redirectUrl": "https://localhost:3000",
    }

    print(f"\nCreating system user request at: {url}")
    print(f"Payload:\n{json.dumps(request_payload, indent=2, ensure_ascii=False)}\n")

    response = httpx.post(
        url,
        json=request_payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        timeout=30.0,
    )

    print(f"Response status: {response.status_code}")

    try:
        body = response.json()
        print(f"Response body:\n{json.dumps(body, indent=2, ensure_ascii=False)}")
    except Exception:
        print(f"Response body: {response.text}")
        body = None

    if response.status_code in (200, 201):
        print("\nSUCCESS: System user request created!")
        if body and "confirmUrl" in body:
            print(f"\n{'='*60}")
            print(f"CONFIRM URL (open in browser and approve):")
            print(f"{body['confirmUrl']}")
            print(f"{'='*60}")
            print(f"\nThis request expires in 10 days if not approved.")
        return body
    else:
        print(f"\nFAILED: Request failed with status {response.status_code}")
        return None


def main():
    print("=== Altinn System User Request for Ciri ===\n")

    # Step 1: Get token
    print("Step 1: Getting Maskinporten token...")
    token = get_maskinporten_token(SCOPE)

    # Step 2: Create request
    print("\nStep 2: Creating system user request...")
    result = create_systemuser_request(token)

    if result:
        print("\n=== Next Steps ===")
        print("1. Open the confirmUrl above in a browser")
        print("2. Log in with admin access for org 927185695")
        print("3. Approve the system user request")
        print("4. Run retrieve_systemuser.py to get the systemuser_id")


if __name__ == "__main__":
    main()
