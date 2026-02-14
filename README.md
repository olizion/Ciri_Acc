# Ciri - AI Accounting System

AI-powered accounting system for Norwegian small businesses. Built with Next.js 16, React 19, Python FastAPI, and Qwen2.5-VL for OCR.

## Quick Start with Docker

The easiest way to run Ciri is with Docker Compose:

```bash
# Start all services (PostgreSQL, Redis, Backend, Frontend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Open [http://localhost:3000](http://localhost:3000) to access Ciri.

## Development Setup

### Prerequisites

- Node.js 20+
- Python 3.12+
- pnpm
- Ollama (for local OCR)
- poppler-utils (for PDF support)

### Install Dependencies

```bash
# Frontend
cd frontend
pnpm install

# Backend
cd ../backend
pip install -r requirements.txt

# macOS: Install poppler for PDF support
brew install poppler
```

### Start Development Servers

```bash
# Terminal 1: Start Ollama (for OCR)
ollama serve

# Download the vision model (first time only)
ollama pull qwen2.5vl:7b

# Terminal 2: Start Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 3: Start Frontend
cd frontend
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
ciri/
├── frontend/           # Next.js 16 + React 19 frontend
│   ├── app/           # App router pages
│   ├── components/    # React components
│   ├── lib/           # Utilities and helpers
│   └── public/        # Static assets
├── backend/           # Python FastAPI backend
│   ├── api/           # API routes
│   ├── config/        # Settings
│   └── models/        # Database models
└── docker-compose.yml # Docker orchestration
```

## Features

- **Bilag Processing** - Upload invoices with AI-powered OCR
- **Automatic Bookkeeping** - Ciri suggests accounts and VAT codes
- **MVA Calculation** - Automatic VAT handling including foreign invoices
- **Currency Conversion** - Real-time exchange rates for foreign invoices
- **SAF-T Export** - Norwegian standard audit file format

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Python 3.12, FastAPI, SQLAlchemy, PostgreSQL, Redis
- **AI/OCR**: Ollama + Qwen2.5-VL (local, private, free)
- **Theme**: Lavender Dream (soft Nordic aesthetic)

## Environment Variables

Create `.env` files:

**Frontend** (`frontend/.env`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```env
DEBUG=true
DATABASE_URL=postgresql+asyncpg://ciri:ciri@localhost:5432/ciri
REDIS_URL=redis://localhost:6379/0
OLLAMA_HOST=http://localhost:11434
```

## License

MIT
