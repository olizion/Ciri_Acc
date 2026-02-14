# Phase 1: Implementation Tasks

## Frontend Tasks

### 1. Authentication Pages
- [ ] Create `/app/(auth)/login/page.tsx`
  - Email/password form with validation
  - "Remember me" toggle
  - Link to forgot password
  - Social login placeholders (BankID future)
  - Background: Use ciribakgrunn.png with overlay

- [ ] Create `/app/(auth)/register/page.tsx`
  - Multi-step wizard:
    1. Email + password
    2. Company lookup (org.nr from Brønnøysund)
    3. Autonomy level selection
    4. Email integration setup
  - Progress indicator
  - Validation on each step

- [ ] Create `/app/(auth)/forgot-password/page.tsx`
  - Email input
  - Success/error states
  - Link back to login

### 2. Company Onboarding Components
- [ ] Create `/components/onboarding/company-lookup.tsx`
  - Search by org.nr or name
  - Display company info preview
  - Confirm selection

- [ ] Create `/components/onboarding/autonomy-selector.tsx`
  - Two cards: Assistent, Autonom
  - Visual indicators of what each does
  - Recommended badge on "Assistent"

### 3. Dashboard Enhancements
- [ ] Update `/app/dashboard/(auth)/ciri/page.tsx`
  - Add loading skeletons
  - Real data placeholders for API integration
  - Responsive adjustments

- [ ] Create `/components/dashboard/kpi-card.tsx`
  - Generic KPI card with:
    - Icon, title, value
    - Trend indicator (up/down/neutral)
    - Sparkline option
    - Click to expand

### 4. Ciri Chat Integration
- [ ] Update `/app/dashboard/(auth)/ciri/chat/page.tsx`
  - Add API integration hooks
  - Context awareness (current page)
  - Markdown rendering improvements
  - Loading states

## Backend Tasks

### 1. Project Setup
- [ ] Create `backend/main.py` - FastAPI app
- [ ] Create `backend/config/settings.py` - Environment config
- [ ] Create `backend/config/database.py` - PostgreSQL connection
- [ ] Create `backend/config/redis.py` - Redis connection
- [ ] Create `requirements.txt` with dependencies

### 2. Database Models
- [ ] Create `backend/models/user.py`
  ```python
  class User:
      id: UUID
      email: str (encrypted)
      password_hash: str
      created_at: datetime
      updated_at: datetime
      is_active: bool
      is_verified: bool
      mfa_enabled: bool
      mfa_secret: str (encrypted)
  ```

- [ ] Create `backend/models/company.py`
  ```python
  class Company:
      id: UUID
      org_number: str
      name: str
      address: str
      industry_code: str (NACE)
      mva_registered: bool
      autonomy_level: enum (assistant, autonomous)
      encryption_key_id: str
      created_at: datetime
  ```

- [ ] Create `backend/models/audit_log.py`
  ```python
  class AuditLog:
      id: UUID
      timestamp: datetime
      user_id: UUID (nullable)
      company_id: UUID (nullable)
      action: str
      resource_type: str
      resource_id: str
      ip_address: str
      user_agent: str
      details: JSON
      # IMMUTABLE - no update/delete allowed
  ```

### 3. API Endpoints
- [ ] Create `backend/api/auth.py`
  - POST /api/auth/register
  - POST /api/auth/login
  - POST /api/auth/logout
  - POST /api/auth/refresh
  - POST /api/auth/forgot-password
  - POST /api/auth/reset-password
  - POST /api/auth/verify-email

- [ ] Create `backend/api/company.py`
  - GET /api/company/lookup/{org_number}
  - POST /api/company/setup
  - GET /api/company/me
  - PATCH /api/company/me

- [ ] Create `backend/api/ciri.py`
  - POST /api/ciri/chat
  - GET /api/ciri/context
  - GET /api/ciri/suggestions

### 4. Services
- [ ] Create `backend/services/auth_service.py`
  - Password hashing (argon2)
  - JWT token generation
  - Email verification flow

- [ ] Create `backend/services/brreg_service.py`
  - Brønnøysund API integration
  - Company data mapping

- [ ] Create `backend/services/ciri_service.py`
  - Anthropic API integration
  - Context building
  - Response caching

### 5. Middleware
- [ ] Create `backend/middleware/audit.py`
  - Log all requests to AuditLog
  - Capture: user, action, resource, IP, timestamp

- [ ] Create `backend/middleware/encryption.py`
  - Per-company encryption key management
  - Field-level encryption helpers

## Integration Tasks
- [ ] Set up CORS for frontend-backend communication
- [ ] Configure environment variables
- [ ] Create Docker Compose for local development
- [ ] Set up database migrations (Alembic)
