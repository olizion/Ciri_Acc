# CIRI Execution Plan Overview

## Project Structure (Monorepo)
```
shadcn-ui-kit-dashboard/
├── app/                      # Next.js 16 frontend
│   ├── (marketing)/          # Landing page, pricing, about
│   ├── (auth)/               # Login, register, forgot-password
│   └── dashboard/(auth)/ciri/ # Main application
├── backend/                  # Python FastAPI backend
│   ├── api/                  # API endpoints
│   ├── services/             # Business logic
│   ├── models/               # SQLAlchemy models
│   ├── utils/                # Helpers
│   └── config/               # Settings
├── components/               # Shared React components
├── lib/                      # Shared utilities
└── .claude/execution/        # This execution plan
```

## Color Scheme (from ciribakgrunn.png)
The Lavender Dream theme captures the Nordic landscape:
- **Primary**: oklch(0.71 0.16 293.54) - Soft lavender
- **Accent Sky**: Light cerulean blue (#87CEEB range)
- **Accent Sage**: Muted green (#90A955 range)
- **Accent Bloom**: Soft pink/rose (#E8B4B8 range)
- **Background**: Warm cream/off-white

## Phase Execution Order
1. **Phase 1**: Foundation + Infrastructure (Current)
2. **Phase 2**: Core Accounting + Bokføringsloven
3. **Phase 3**: Autonomy & AI Learning
4. **Phase 4**: Årsregnskap Engine
5. **Phase 5**: Salary System (Lønn)
6. **Phase 6**: Polish & Launch
7. **Phase 7**: Maintenance (Ongoing)

## Technology Stack
**Frontend:**
- Next.js 16 with React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion for animations
- Recharts for data visualization

**Backend:**
- Python 3.12+ with FastAPI
- SQLAlchemy with PostgreSQL
- Redis for caching
- Celery for background tasks
- Anthropic SDK for AI

**Infrastructure:**
- Azure Norway East (primary)
- Azure West Europe (backup)
- Redis Cloud
- PostgreSQL (Azure Database)

## Key Compliance Requirements
Every phase must satisfy:
- [ ] Bokføringsloven §4 (10 principles)
- [ ] Two-way audit trail (§6)
- [ ] Document integrity (SHA-256, PDF/A)
- [ ] SAF-T v1.30 export capability
- [ ] GDPR data subject rights
- [ ] Norwegian/EØS data residency

## Getting Started
Read each phase folder in order. Each contains:
1. `OBJECTIVES.md` - What we're building
2. `TASKS.md` - Concrete implementation tasks
3. `API.md` - Backend endpoints needed
4. `COMPLIANCE.md` - Legal requirements for this phase
