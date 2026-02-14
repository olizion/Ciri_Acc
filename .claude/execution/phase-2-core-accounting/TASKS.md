# Phase 2: Implementation Tasks

## Database Models

### Bilag Model
```python
class Bilag:
    id: UUID
    company_id: UUID (FK)
    bilag_number: str  # Sequential: "2025-00001"
    document_date: date
    receipt_date: datetime
    description: str
    gross_amount: Decimal
    net_amount: Decimal
    mva_amount: Decimal
    mva_code: str (FK)
    counterparty_name: str
    counterparty_org_number: str
    category: str
    file_path: str (encrypted)
    file_hash_sha256: str
    original_filename: str
    mime_type: str
    ocr_text: str
    ocr_confidence: float
    status: enum (pending, approved, posted, rejected)
    created_by_ciri: bool
    ciri_confidence: float
    ciri_reasoning: str
    created_at: datetime
    updated_at: datetime
    posted_at: datetime
```

### Postering Model
```python
class Postering:
    id: UUID
    company_id: UUID (FK)
    bilag_id: UUID (FK)  # Two-way link
    journal_id: str
    posting_date: date
    period: str  # "2025-01"
    account_number: str (FK)
    description: str
    debit_amount: Decimal
    credit_amount: Decimal
    mva_code: str
    mva_amount: Decimal
    saft_transaction_id: str
    created_by_ciri: bool
    created_at: datetime
    # NO updated_at - postings are immutable
```

### Konto Model
```python
class Konto:
    id: UUID
    company_id: UUID (FK)
    number: str  # "1920", "6540"
    name: str
    type: enum (asset, liability, equity, income, expense)
    parent_number: str
    is_active: bool
    saft_standard_id: str  # Næringsspesifikasjon mapping
    created_at: datetime
```

### MVAKode Model
```python
class MVAKode:
    id: UUID
    code: str  # "3", "5", "6"
    name: str
    rate: Decimal  # 0.25, 0.15, 0.12
    saft_code: str
    is_input: bool  # true = inngående, false = utgående
```

## Frontend Tasks

### Bilag Pages
- [ ] Create `/app/dashboard/(auth)/ciri/bilag/page.tsx` - List view (done, enhance)
- [ ] Create `/app/dashboard/(auth)/ciri/bilag/[id]/page.tsx` - Detail view
- [ ] Create `/app/dashboard/(auth)/ciri/bilag/upload/page.tsx` - Upload wizard
- [ ] Create `/components/bilag/bilag-card.tsx` - Card component
- [ ] Create `/components/bilag/bilag-preview.tsx` - Document preview
- [ ] Create `/components/bilag/ocr-editor.tsx` - Edit OCR results

### Hovedbok Pages
- [ ] Create `/app/dashboard/(auth)/ciri/hovedbok/page.tsx`
- [ ] Create `/app/dashboard/(auth)/ciri/hovedbok/[konto]/page.tsx`
- [ ] Create `/components/hovedbok/account-tree.tsx`
- [ ] Create `/components/hovedbok/transaction-table.tsx`

### Report Pages
- [ ] Update `/app/dashboard/(auth)/ciri/balanse/page.tsx`
- [ ] Create `/app/dashboard/(auth)/ciri/resultat/page.tsx`
- [ ] Create `/components/reports/balance-sheet.tsx`
- [ ] Create `/components/reports/income-statement.tsx`
- [ ] Create `/components/reports/period-comparison.tsx`

### MVA Pages
- [ ] Update `/app/dashboard/(auth)/ciri/mva/page.tsx`
- [ ] Create `/app/dashboard/(auth)/ciri/mva/[termin]/page.tsx`
- [ ] Create `/components/mva/mva-summary.tsx`
- [ ] Create `/components/mva/mva-lines.tsx`
- [ ] Create `/components/mva/altinn-preview.tsx`

## Backend Tasks

### API Endpoints
```
# Bilag
POST   /api/bilag/upload
GET    /api/bilag
GET    /api/bilag/{id}
PATCH  /api/bilag/{id}
POST   /api/bilag/{id}/approve
POST   /api/bilag/{id}/reject
DELETE /api/bilag/{id}

# Postings
GET    /api/posterings
GET    /api/posterings/{id}
POST   /api/posterings/from-bilag/{bilag_id}

# Accounts
GET    /api/kontoplan
GET    /api/kontoplan/{number}
GET    /api/kontoplan/{number}/transactions

# Reports
GET    /api/reports/balance
GET    /api/reports/income
GET    /api/reports/trial-balance

# MVA
GET    /api/mva/termins
GET    /api/mva/termins/{termin}
POST   /api/mva/termins/{termin}/calculate
GET    /api/mva/termins/{termin}/preview

# SAF-T
GET    /api/saft/export
GET    /api/saft/validate
```

### Services
- [ ] `BilagService` - Upload, OCR, categorization
- [ ] `PosteringService` - Create postings, validation
- [ ] `KontoplanService` - Account management
- [ ] `MVAService` - VAT calculation
- [ ] `ReportService` - Generate reports
- [ ] `SAFTService` - Export generation

### OCR Pipeline
- [ ] Integrate with Azure Document Intelligence
- [ ] Extract: date, amount, vendor, description
- [ ] Map to accounts using AI
- [ ] Calculate confidence score
