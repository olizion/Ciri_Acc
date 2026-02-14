"""
Ciri AI API Routes
Chat, suggestions, and AI interactions
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()


class ChatMessage(BaseModel):
    """Chat message from user."""
    message: str
    context: dict | None = None


class ChatResponse(BaseModel):
    """Chat response from Ciri."""
    id: str
    role: str = "assistant"
    content: str
    timestamp: datetime
    actions: list[dict] | None = None
    metadata: dict | None = None


class Suggestion(BaseModel):
    """Quick suggestion."""
    icon: str
    label: str
    query: str


@router.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    """
    Send message to Ciri AI.

    1. Build context from current page and company data
    2. Check response cache for similar queries
    3. Call AI with context and message
    4. Parse response for actions
    5. Cache response
    6. Log AI decision
    """
    # TODO: Implement actual AI integration
    return ChatResponse(
        id="msg-uuid",
        content="""Jeg ser på regnskapet ditt nå.

Her er en rask oppsummering:
- **Banksaldo**: kr 360 000
- **Resultat hittil i år**: kr 352 890
- **MVA å betale**: kr 23 450

Er det noe spesifikt du vil vite mer om?""",
        timestamp=datetime.utcnow(),
        actions=[
            {
                "type": "navigate",
                "label": "Se balanse",
                "target": "/dashboard/balanse"
            }
        ],
        metadata={
            "model": "claude-3-5-sonnet",
            "tokens_used": 250,
            "cached": False
        }
    )


@router.get("/suggestions", response_model=list[Suggestion])
async def get_suggestions(page: str = "dashboard", limit: int = 5):
    """
    Get contextual suggestions based on current page.
    """
    suggestions_map = {
        "dashboard": [
            Suggestion(icon="file-text", label="Siste bilag", query="Vis de siste bilagene som er bokført"),
            Suggestion(icon="calculator", label="MVA-status", query="Hva er MVA-status for denne terminen?"),
            Suggestion(icon="trending-up", label="Resultat", query="Vis resultat hittil i år"),
            Suggestion(icon="users", label="Lønn", query="Gi meg en oversikt over lønnskostnader"),
            Suggestion(icon="help-circle", label="Forklar", query="Forklar balanserapporten min"),
        ],
        "bilag": [
            Suggestion(icon="search", label="Søk bilag", query="Søk etter bilag fra Adobe"),
            Suggestion(icon="alert-circle", label="Manglende", query="Hvilke bilag mangler for årsregnskapet?"),
            Suggestion(icon="check", label="Godkjenn alle", query="Vis bilag som venter på godkjenning"),
        ],
        "mva": [
            Suggestion(icon="calculator", label="Beregn MVA", query="Beregn MVA for denne terminen"),
            Suggestion(icon="send", label="Send melding", query="Forbered MVA-melding for innsending"),
            Suggestion(icon="history", label="Historikk", query="Vis MVA-historikk for i år"),
        ],
    }

    return suggestions_map.get(page, suggestions_map["dashboard"])[:limit]


@router.get("/context")
async def get_context():
    """
    Get current context for AI.

    Returns company data, recent activity, and relevant metrics.
    """
    return {
        "company": {
            "name": "Mitt Konsulentselskap AS",
            "autonomy_level": "assistant",
            "industry": "IT-konsulent"
        },
        "metrics": {
            "bank_balance": 360000,
            "result_ytd": 352890,
            "pending_bilag": 2,
            "mva_due_days": 12
        },
        "recent_activity": [
            {"type": "bilag_posted", "description": "Adobe-faktura bokført", "timestamp": "2025-01-30T10:00:00Z"},
            {"type": "mva_calculated", "description": "MVA beregnet for 6. termin", "timestamp": "2025-01-29T15:00:00Z"},
        ]
    }


@router.post("/feedback")
async def submit_feedback(decision_id: str, feedback: str, correction: dict | None = None):
    """
    Submit feedback on Ciri decision.

    1. Store feedback in CiriDecision
    2. Update learning model
    3. Improve future suggestions
    """
    return {"message": "Takk for tilbakemeldingen!"}
