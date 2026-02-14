# Phase 1: Compliance Requirements

## Infrastructure Compliance

### Data Residency (Bokføringsforskriften)
- [ ] **Primary hosting**: Azure Norway East
- [ ] **Backup/DR**: Azure West Europe (EØS-compliant)
- [ ] **NO data in USA**: Verify all services are EØS-only
- [ ] **Sub-processors**: Document all third-party services

### Encryption (GDPR Art. 32)
- [ ] **In Transit**: TLS 1.3 mandatory on all endpoints
- [ ] **At Rest**: AES-256-GCM for database
- [ ] **Per-Company Keys**: Derive unique encryption keys per company
- [ ] **Key Management**: Azure Key Vault for master keys

### Audit Logging (Bokføringsloven §4)
- [ ] **Immutable Log**: AuditLog table is append-only
- [ ] **Required Fields**:
  - Timestamp (with timezone)
  - User ID
  - Company ID
  - Action type
  - Resource type and ID
  - IP address
  - User agent
  - Before/after values for changes

- [ ] **Log These Events**:
  - User login/logout
  - Failed login attempts
  - Password changes
  - Company settings changes
  - API key generation
  - Data exports

## GDPR Compliance

### Privacy Policy (Art. 13/14)
- [ ] Create `/app/(marketing)/personvern/page.tsx`
- [ ] Include:
  - Data controller info (Ciri AS)
  - Contact details
  - Purpose of processing
  - Legal basis for each data type
  - Data retention periods
  - Data subject rights
  - Sub-processor list
  - International transfers

### Cookie Consent (ePrivacy)
- [ ] Implement cookie consent banner
- [ ] Categorize cookies:
  - Necessary (always on)
  - Functional (session, preferences)
  - Analytics (opt-in)
  - Marketing (opt-in)
- [ ] Store consent preferences
- [ ] Respect user choices

### Terms of Service
- [ ] Create `/app/(marketing)/vilkar/page.tsx`
- [ ] Include:
  - Service description
  - User obligations
  - Limitation of liability
  - Intellectual property
  - Termination conditions
  - Governing law (Norway)

## Security Measures

### Authentication
- [ ] **Password Requirements**:
  - Minimum 12 characters
  - At least one uppercase, lowercase, number
  - Check against breached passwords (HaveIBeenPwned)

- [ ] **Rate Limiting**:
  - Login: 5 attempts per 15 minutes per IP
  - Registration: 3 per hour per IP
  - Password reset: 3 per hour per email

- [ ] **Session Management**:
  - Access token: 1 hour expiry
  - Refresh token: 7 days (remember me) or 24 hours
  - Revoke all sessions on password change

### API Security
- [ ] CORS whitelist only ciri.no domains
- [ ] CSRF protection on state-changing endpoints
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (escape all output)

## Checklist Before Moving to Phase 2

### Technical
- [ ] All auth flows work end-to-end
- [ ] Database migrations run successfully
- [ ] Redis caching operational
- [ ] API documentation generated (OpenAPI)

### Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent implemented
- [ ] Audit logging verified
- [ ] Encryption verified
- [ ] Data residency documented

### Testing
- [ ] Unit tests for auth services
- [ ] Integration tests for API endpoints
- [ ] Security scan (no critical vulnerabilities)
