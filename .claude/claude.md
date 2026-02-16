# Ciri Development Directive

At session start output exactly: AY AY CAPTAIN

## What is Ciri

AI-powered accounting system for Norwegian small businesses. Norwegian bokmål UI, English code.

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind, shadcn/ui, Framer Motion, Lucide icons
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy, PostgreSQL, Redis
- **AI**: Anthropic Claude API (Haiku/Sonnet/Opus tiered)

## Key Paths

- `frontend/lib/api.ts` — API_BASE_URL + COMPANY_ID (use everywhere)
- `frontend/lib/themes.ts` — Lavender Dream theme
- `frontend/components/layout/sidebar/nav-main.tsx` — Navigation
- `backend/services/batch_ocr_processor.py` — Reference Claude API usage

## Design System

- **Theme**: Lavender Dream (soft lavender/purple). `font-display` for headings. Lucide icons.
- **Animations**: Framer Motion — micro-interactions 150-200ms, page transitions 300ms
- **Tone**: Norwegian bokmål, slightly casual ("du" not "De")
- **Performance**: Dynamic imports for heavy libs (xlsx, recharts, pdf). Debounce search 300ms. `React.memo` list items.
- **API calls**: Always use `API_BASE_URL`, always error-handle with toast

## Skills

| Skill | Trigger |
|---|---|
| `frontend-design` | Creating or modifying UI components |

## Post-Implementation Review

After code changes, do a single review pass checking:

1. **Correctness** — Logic errors, null access, missing awaits, wrong refs
2. **Integration** — Uses `API_BASE_URL`, imports complete, no unused vars/props
3. **Edge cases** — Empty/loading/error states, null data
4. **UX** — Keyboard nav, ESC closes dialogs, contrast, animations smooth
5. **Security** — No client-side secrets, no sensitive logs, XSS escaping

Fix issues found, then move on. Do NOT re-read all files multiple times or restart from pass 1.

## Done When

- `npx tsc --noEmit` passes (no new errors)
- No unused imports/vars
- Loading + empty + error states present
- Consistent with Lavender Dream theme
