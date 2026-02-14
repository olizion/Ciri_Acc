# Phase 4: Årsregnskap (Annual Report) Engine

## Objective
Build the zero-touch annual accounts system that makes Ciri revolutionary.

## Deliverables

### 1. Readiness Score Engine
- Calculate 0-100% completion score
- Break down by category:
  - Bilag completeness
  - Bank reconciliation
  - MVA submissions
  - Asset depreciation
  - Accruals
  - Period closings

### 2. Proactive Gap Detection
- Identify missing documents
- "3 months of electricity missing"
- "December payroll not recorded"
- Auto-request missing documents

### 3. Annual Report Generation
- **Resultatregnskap** (Income Statement)
- **Balanse** (Balance Sheet)
- **Noter** (Notes) - small company format
- **Kontantstrømoppstilling** (optional)

### 4. Altinn Integration
- RF-1167 (Næringsoppgave) XML generator
- Pre-fill skattemelding data
- Direct submission to Altinn
- Status tracking

### 5. Year-End Closing
- Period lock functionality
- Balance validation before close
- Correction entry workflow
- Audit trail for closing

### 6. PDF Report Generator
- Professional design
- Company branding
- Digital signature support
- Archival quality (PDF/A)

## Success Criteria
- [ ] Readiness score updates in real-time
- [ ] Generated reports meet Regnskapsloven requirements
- [ ] Altinn submission works end-to-end
- [ ] Year-end can be closed in <1 hour
