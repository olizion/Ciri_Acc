# Maskinporten Setup Guide for Ciri

This guide explains how to configure Ciri to fetch real tax data from Skatteetaten.

## Overview

To fetch tax cards (skattekort) from Skatteetaten, you need:
1. A **virksomhetssertifikat** (enterprise certificate)
2. A **Maskinporten integration** configured in Samarbeidsportalen
3. Access to the **Skattekort API**

## Prerequisites

- Your company must be registered in Enhetsregisteret
- You need administrator access to your organization's Altinn/Samarbeidsportalen
- A virksomhetssertifikat from Buypass or Commfides

---

## Step 1: Get a Virksomhetssertifikat

A virksomhetssertifikat is an enterprise certificate that identifies your organization.

### Option A: Buypass (Recommended)
1. Go to https://www.buypass.no/produkter/virksomhetssertifikat
2. Order a "Buypass ID for virksomhet"
3. Complete the verification process
4. Download your certificate

### Option B: Commfides
1. Go to https://www.commfides.com/virksomhetssertifikat
2. Order a certificate
3. Complete verification
4. Download your certificate

### Export the Private Key

After receiving your certificate:

```bash
# If you have a .p12/.pfx file, extract the private key:
openssl pkcs12 -in certificate.p12 -nocerts -nodes -out private_key.pem

# Remove the passphrase (if any):
openssl rsa -in private_key.pem -out private_key_nopass.pem
mv private_key_nopass.pem private_key.pem
```

Place the `private_key.pem` file in `backend/certs/private_key.pem`.

---

## Step 2: Register in Samarbeidsportalen

1. Go to https://samarbeid.digdir.no
2. Log in with your personal ID (you need administrator rights)
3. Select your organization

### Create an Integration

1. Navigate to "Integrasjoner" → "Selvbetjening"
2. Click "Ny integrasjon"
3. Fill in:
   - **Navn**: `Ciri Lønnssystem`
   - **Beskrivelse**: `Integrasjon for å hente skattekort`
   - **Scopes**: Add `skatteetaten:skattekort`
4. Upload your virksomhetssertifikat's **public key**
5. Save and note down your **Client ID**

### Test Environment

For testing, use the "Ver 2" environment:
1. Go to https://sjolvbetjening.test.samarbeid.digdir.no
2. Create a test integration
3. Use test personnummer for testing

---

## Step 3: Apply for Skatteetaten API Access

1. Go to https://skatteetaten.github.io/api-dokumentasjon/
2. Navigate to "Skattekort API"
3. Follow the application process
4. Wait for approval (usually 1-2 weeks)

---

## Step 4: Configure Ciri

Add the following to your `.env` file:

```env
# ===========================================
# MASKINPORTEN CONFIGURATION
# ===========================================

# Environment: "test" for testing, "prod" for production
MASKINPORTEN_ENV=test

# Your Client ID from Samarbeidsportalen
MASKINPORTEN_CLIENT_ID=your-client-id-here

# Your organization number (9 digits)
MASKINPORTEN_ISSUER=123456789

# Path to your private key file
MASKINPORTEN_PRIVATE_KEY_PATH=./certs/private_key.pem

# OR base64 encode your private key and use this instead:
# MASKINPORTEN_PRIVATE_KEY_BASE64=LS0tLS1CRUdJTi...

# ===========================================
# SKATTEETATEN CONFIGURATION
# ===========================================

# Scopes to request
SKATTEETATEN_SCOPES=skatteetaten:skattekort

# ===========================================
# FOLKEREGISTERET (Optional)
# ===========================================

# Enable if you have access to Folkeregisteret
FOLKEREGISTER_ENABLED=false
FOLKEREGISTER_SCOPES=folkeregister:deling/offentligmedhjemmel
```

---

## Step 5: Test the Integration

### Check Configuration Status

```bash
curl http://localhost:8000/api/employees/config/status
```

Expected response when configured:
```json
{
  "maskinporten_configured": true,
  "environment": "test",
  "using_mock": false,
  "details": {
    "maskinporten": {
      "environment": "test",
      "client_id_set": true,
      "issuer_set": true,
      "private_key_file_exists": true,
      "is_configured": true
    }
  }
}
```

### Test Personnummer Lookup

```bash
curl -X POST http://localhost:8000/api/employees/lookup \
  -H "Content-Type: application/json" \
  -d '{"personnummer": "12345678901"}'
```

---

## Test Personnummer

For testing in the test environment, use these synthetic personnummer:
- `01010101010` - Standard test person
- `02020202020` - Another test person

These are synthetic and won't return real data, but will verify the API connection works.

---

## Troubleshooting

### "maskinporten_client_id not configured"
→ Set the `MASKINPORTEN_CLIENT_ID` environment variable

### "Failed to load private key"
→ Check that the private key file exists and is valid PEM format

### "Token request failed (400)"
→ Your client_id or private key may not match what's registered in Samarbeidsportalen

### "403 Forbidden from Skatteetaten"
→ Your integration may not have the required scopes, or access hasn't been approved yet

---

## Security Notes

1. **Never commit private keys** to version control
2. Store production keys securely (use a secrets manager)
3. Use environment variables, not hardcoded values
4. The private key should have restricted permissions: `chmod 600 private_key.pem`
5. Rotate certificates before they expire

---

## API Reference

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/employees/config/status` | Check configuration status |
| POST | `/api/employees/lookup` | Lookup personnummer |
| POST | `/api/employees/` | Create employee |
| GET | `/api/employees/` | List employees |
| GET | `/api/employees/{id}` | Get employee |
| PUT | `/api/employees/{id}` | Update employee |
| DELETE | `/api/employees/{id}` | Delete employee |
| POST | `/api/employees/{id}/refresh-tax-card` | Refresh tax card |

### Scopes Reference

| Scope | Access |
|-------|--------|
| `skatteetaten:skattekort` | Fetch tax cards |
| `skatteetaten:amelding/write` | Submit A-melding |
| `folkeregister:deling/offentligmedhjemmel` | Person lookup |

---

## Links

- [Maskinporten Documentation](https://docs.digdir.no/docs/Maskinporten/)
- [Samarbeidsportalen](https://samarbeid.digdir.no)
- [Skatteetaten API Documentation](https://skatteetaten.github.io/api-dokumentasjon/)
- [Buypass Certificates](https://www.buypass.no/produkter/virksomhetssertifikat)
- [Commfides Certificates](https://www.commfides.com/virksomhetssertifikat)
