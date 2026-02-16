# Ciri AI Accounting System

## Quick Start

```bash
docker-compose up -d db redis backend   # Backend + DB + Redis in Docker
cd frontend && pnpm dev                 # Frontend runs locally (native)
```

**Important**: Always run the frontend natively (`pnpm dev`), NOT in Docker. Docker bind mounts on macOS are ~10x slower for filesystem-heavy tools like Turbopack, causing multi-minute cold compiles and broken hot reload. The backend, DB, and Redis stay in Docker.

## Structure

```
/frontend/app/dashboard/    # Dashboard pages
/frontend/components/       # Shared components
/frontend/lib/              # Utilities (api.ts, themes.ts)
/backend/api/               # API routes
/backend/services/          # Business logic
/.claude/claude.md          # Development directives
```
