# Phase 1: Foundation + Infrastructure

## Objective
Establish the core infrastructure, authentication flow, and basic UI framework for Ciri.

## Deliverables
1. **Complete Auth Flow**
   - Login page with beautiful UI
   - Registration with company setup
   - Forgot password flow
   - 2FA setup (optional)

2. **Company Onboarding**
   - Brønnøysund integration for company lookup
   - Company profile setup
   - Autonomy level selection

3. **Core Dashboard**
   - Main dashboard with KPI widgets
   - Navigation sidebar (already done)
   - Header with user menu

4. **Ciri Chat Interface**
   - Side panel chat
   - Context awareness
   - Basic Q&A functionality

5. **Backend Foundation**
   - FastAPI project structure
   - Database models (User, Company, AuditLog)
   - Authentication endpoints
   - Redis caching layer

## Success Criteria
- [ ] User can register, login, and access dashboard
- [ ] Company info is fetched from Brønnøysund
- [ ] Ciri chat responds to basic questions
- [ ] All API calls are logged in AuditLog
- [ ] TLS 1.3 enforced on all endpoints
