# Phase 1: API Specification

## Base URL
- Development: `http://localhost:8000/api`
- Production: `https://api.ciri.no/api`

## Authentication Endpoints

### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "company": {
    "org_number": "123456789",
    "autonomy_level": "assistant"
  }
}
```

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2025-01-31T12:00:00Z"
  },
  "company": {
    "id": "uuid",
    "org_number": "123456789",
    "name": "Selskap AS",
    "autonomy_level": "assistant"
  },
  "message": "Verification email sent"
}
```

### POST /api/auth/login
Authenticate user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "remember_me": true
}
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "company": {
      "id": "uuid",
      "name": "Selskap AS"
    }
  }
}
```

### POST /api/auth/refresh
Refresh access token.

**Request:**
```json
{
  "refresh_token": "eyJ..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJ...",
  "expires_in": 3600
}
```

## Company Endpoints

### GET /api/company/lookup/{org_number}
Look up company from Brønnøysund.

**Response (200):**
```json
{
  "org_number": "123456789",
  "name": "Selskap AS",
  "address": {
    "street": "Gateveien 1",
    "postal_code": "0123",
    "city": "Oslo"
  },
  "industry": {
    "code": "62.020",
    "description": "Konsulentvirksomhet innen datateknikk"
  },
  "registered_date": "2020-01-15",
  "employees": 5,
  "revenue_range": "1-5M NOK"
}
```

### GET /api/company/me
Get current company details.

**Response (200):**
```json
{
  "id": "uuid",
  "org_number": "123456789",
  "name": "Selskap AS",
  "address": { ... },
  "industry": { ... },
  "mva_registered": true,
  "mva_period": "bi_monthly",
  "autonomy_level": "assistant",
  "settings": {
    "email_integration": true,
    "bilag_email": "bilag-abc123@ciri.no"
  },
  "stats": {
    "bilag_count": 247,
    "last_activity": "2025-01-31T10:30:00Z"
  }
}
```

## Ciri Chat Endpoints

### POST /api/ciri/chat
Send message to Ciri.

**Request:**
```json
{
  "message": "Hva er MVA-status for denne terminen?",
  "context": {
    "current_page": "dashboard",
    "selected_items": []
  }
}
```

**Response (200):**
```json
{
  "id": "msg_uuid",
  "role": "assistant",
  "content": "## MVA-status 6. termin...",
  "timestamp": "2025-01-31T12:00:00Z",
  "actions": [
    {
      "type": "navigate",
      "label": "Se MVA-detaljer",
      "target": "/dashboard/ciri/mva"
    },
    {
      "type": "confirm",
      "label": "Send MVA-melding",
      "action": "submit_mva"
    }
  ],
  "metadata": {
    "model": "claude-3-5-sonnet",
    "tokens_used": 450,
    "cached": false
  }
}
```

### GET /api/ciri/suggestions
Get contextual suggestions.

**Query params:**
- `page`: Current page identifier
- `limit`: Max suggestions (default 5)

**Response (200):**
```json
{
  "suggestions": [
    {
      "icon": "file-text",
      "label": "Vis siste bilag",
      "query": "Vis de siste bilagene som er bokført"
    },
    {
      "icon": "calculator",
      "label": "MVA-status",
      "query": "Hva er MVA-status for denne terminen?"
    }
  ]
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "validation_error",
  "message": "Ugyldig e-postadresse",
  "details": {
    "field": "email",
    "code": "invalid_format"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Ugyldig eller utløpt token"
}
```

### 403 Forbidden
```json
{
  "error": "forbidden",
  "message": "Du har ikke tilgang til denne ressursen"
}
```

### 404 Not Found
```json
{
  "error": "not_found",
  "message": "Selskapet ble ikke funnet i Brønnøysund"
}
```

### 429 Too Many Requests
```json
{
  "error": "rate_limited",
  "message": "For mange forespørsler. Prøv igjen om 60 sekunder.",
  "retry_after": 60
}
```

### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "Noe gikk galt. Prøv igjen senere.",
  "reference": "err_abc123"
}
```
