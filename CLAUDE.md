# Ciri AI Accounting System - Claude Instructions

## On Session Start
1. Read `.claude/execution/EXECUTION_OVERVIEW.md` for project context
2. Check current phase status in `.claude/execution/phase-*/`
3. Review any pending tasks from previous sessions

## Project Overview
**Ciri** is an AI-powered accounting system for Norwegian small businesses. It handles:
- Bilag (document) processing with OCR
- Automatic bookkeeping (bokføring)
- MVA (VAT) calculation and submission
- Lønn (payroll) with A-melding
- Årsregnskap (annual reports)
- SAF-T export for tax authorities

## Technology Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind, shadcn/ui
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy, PostgreSQL, Redis
- **AI**: Anthropic Claude API
- **Theme**: Lavender Dream (soft lavender, sky blue, sage green)

## Key Design Principles
1. **Plain Norwegian** - Max 2 sentences, no jargon
2. **Visual-first** - Show, don't tell
3. **Progressive disclosure** - Summary first, details on tap
4. **Lavender Dream aesthetic** - Soft, Nordic, professional

## Critical Compliance Requirements
All work must satisfy:
- **Bokføringsloven** - Norwegian bookkeeping law
- **GDPR** - Data protection
- **SAF-T v1.30** - Standard audit file format
- **Norwegian data residency** - EØS servers only

## Directory Structure
```
/frontend/                      # Next.js frontend application
  /app/dashboard/(auth)/ciri/   # Main Ciri application pages
  /components/                  # Shared React components
  /lib/                         # Utilities and helpers
/backend/                       # Python FastAPI backend
  /api/                         # API routes (auth, bilag, ocr, etc.)
  /config/                      # Settings and configuration
/.claude/execution/             # Phase-by-phase instructions
/docker-compose.yml             # Docker setup for all services
```

## Running the Project

### With Docker (Recommended)
```bash
# Start all services (db, redis, backend, frontend)
docker-compose up -d

# Or for development with hot reload
docker-compose --profile dev up -d
```

### Without Docker
```bash
# Terminal 1: Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Terminal 2: Frontend
cd frontend
pnpm install
pnpm dev

# Terminal 3: Ollama (for OCR)
ollama serve
```

## Current Phase
Check `.claude/execution/` for the current implementation phase and its tasks.

## Code Style
- TypeScript: Strict mode, explicit types
- Python: Type hints, Pydantic models, async/await
- Norwegian comments for user-facing strings
- English comments for technical documentation

## Important Files
- `frontend/lib/themes.ts` - Theme configuration (Lavender Dream)
- `frontend/components/layout/sidebar/nav-main.tsx` - Navigation structure
- `frontend/components/layout/ciri-logo.tsx` - Ciri branding
- `frontend/public/ciribakgrunn.png` - Background image with color palette
- `backend/api/ocr.py` - Invoice OCR with Qwen2.5-VL via Ollama
