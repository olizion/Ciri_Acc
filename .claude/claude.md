# Ciri AI Accounting System - Development Guidelines

## Frontend Development

# Development Operating Directive

## Mandatory UI Skill

Always use the `frontend-design` skill when creating or modifying UI components.

---

## Mandatory Post‑Implementation Review

After completing ANY code change, perform iterative review passes. Each pass must re‑read the actual written code (not memory). Never skip passes. Never declare success unless a full pass finds zero issues.

If a pass finds issues: fix them and restart from Pass 1.

### Pass 1 — Correctness

- Incorrect logic
- Off‑by‑one errors
- Null/undefined access
- Missing awaits / async misuse
- Wrong variable references
- Race conditions

### Pass 2 — Integration

- Must use `API_BASE_URL`
- Frontend/backend enum mismatch
- Wrong hosts in fetch calls
- Missing imports
- Unused props
- Broken contract assumptions

### Pass 3 — Edge Cases

- Empty states
- Loading states
- Error states
- Missing/null data
- 4xx/5xx handling

### Pass 4 — Polish

- Dead code
- Unused variables
- Duplicate logic
- Inconsistent naming

### Pass 5 — UX + Accessibility

- Keyboard navigation works
- Focus visible & logical tab order
- ESC closes dialogs
- Proper roles/labels for controls
- Accessible error messaging
- Contrast readable
- Respects prefers‑reduced‑motion

### Pass 6 — Performance

- Avoid unnecessary re‑renders
- Memoize where meaningful
- No heavy computation during render
- Prevent layout shift
- Debounce/throttle network calls
- Correct pagination/caching

### Pass 7 — Security + Data Handling

- No secrets exposed client‑side
- No sensitive logs
- Escape user content (XSS)
- Proper auth handling (401/403)
- Validate user input

### Pass 8 — Internationalization

- No hard‑coded UI strings if localization exists
- Proper date/number formatting
- Timezone correctness

Stop only when a full pass produces zero issues.

At session start output exactly: AY AY CAPTAIN

---

## Definition of Done (Hard Gates)

Code is NOT complete unless all apply:

- Typecheck passes
- Lint passes
- No console errors or warnings
- No unused imports/vars
- API contract respected
- Loading + empty + error states implemented
- Component visually consistent with Lavender Dream theme
- Animations smooth and intentional
- No generic UI patterns

---

## Output Quality Goals

- Production‑grade interfaces
- Distinct visual identity
- Clean component architecture
- Maintainable abstractions
- Predictable behavior

## Project Context

This is the Ciri AI accounting system for Norwegian businesses. Key features:

- Full autonomy capabilities for MVA, SAF-T, and tax filing
- Two autonomy modes: Assistant and Autonomous
- Norwegian language interface
- Integration with Altinn and Brønnøysund

## Design System

- **Theme**: Lavender Dream (soft lavender/purple tones)
- **Typography**: Use `font-display` for headings
- **Animations**: Use Framer Motion for smooth transitions
- **Icons**: Lucide React icons

## Key Components

- `CiriLogo` - The Ciri avatar using ciribakgrunn.png
- `Fradragsveiviser` - Interactive MVA deduction guide
- `SAFTExportDialog` - SAF-T export functionality

---

## ⚠️ MANDATORY: Claude API Cost Optimization

**ALWAYS apply these optimizations when writing code that calls the Claude API.**
**This is a BLOCKING requirement - do not skip these patterns.**

### 1. Model Selection (REQUIRED)

Choose the cheapest model that can handle the task:

| Task Type                        | Model                       | Cost/1M tokens       |
| -------------------------------- | --------------------------- | -------------------- |
| Invoice OCR (simple)             | `claude-3-5-haiku-20241022` | $0.25 in / $1.25 out |
| Invoice OCR (complex/multi-page) | `claude-sonnet-4-20250514`  | $3 in / $15 out      |
| Chat responses (simple)          | `claude-3-5-haiku-20241022` | $0.25 in / $1.25 out |
| Chat responses (reasoning)       | `claude-sonnet-4-20250514`  | $3 in / $15 out      |
| Complex analysis                 | `claude-opus-4-5-20251101`  | $15 in / $75 out     |

**Implementation pattern:**

```python
def select_model_for_task(task_type: str, complexity: str = "simple") -> str:
    """Select cheapest appropriate model for task."""
    if task_type == "ocr":
        # Use Haiku for single-page invoices, Sonnet for complex
        return "claude-3-5-haiku-20241022" if complexity == "simple" else "claude-sonnet-4-20250514"
    elif task_type == "chat":
        # Use Haiku for simple Q&A, Sonnet for reasoning
        return "claude-3-5-haiku-20241022" if complexity == "simple" else "claude-sonnet-4-20250514"
    elif task_type == "analysis":
        return "claude-sonnet-4-20250514"  # Sonnet is usually enough
    return "claude-3-5-haiku-20241022"  # Default to cheapest
```

### 2. Prompt Caching (REQUIRED for repeated prompts)

**90% cost reduction on cached tokens.** Cache expires after 5 minutes.

**⚠️ IMPORTANT: This is SERVER-SIDE caching of the PROMPT TEXT only.**

- It does NOT cache results or responses
- Each invoice still gets a fresh analysis
- No stale data risk - only the instruction text is reused
- The image/document is always processed fresh

```python
# ALWAYS cache system prompts and large static content
# ALWAYS use AsyncAnthropic in async code (non-blocking)
client = anthropic.AsyncAnthropic(api_key=API_KEY)  # ← Use ASYNC client

message = await client.messages.create(  # ← AWAIT the call
    model=model,
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": INVOICE_EXTRACTION_PROMPT,  # Static prompt
                "cache_control": {"type": "ephemeral"}  # ← REQUIRED
            },
            {
                "type": "image",
                "source": {"type": "base64", "media_type": media_type, "data": base64_image}
            }
        ]
    }]
)
```

**When to cache:**

- System prompts (INVOICE_EXTRACTION_PROMPT, etc.)
- MVA code reference tables
- Norwegian accounting rules
- Any text block > 1024 tokens that's reused

**⚠️ Cache is per-model:** Haiku and Sonnet have separate caches. If you switch models mid-batch, you pay for the prompt twice.

### 3. Batch Processing (REQUIRED for email pipeline)

Process invoices in batches during off-peak times to:

- Benefit from prompt caching (5-min window)
- Reduce API overhead
- Enable smart model selection per invoice

**Batch processing pattern:**

```python
async def process_invoices_batch(
    attachments: list[EmailAttachment],
    db_session,
) -> list[ProcessedInvoice]:
    """
    Process invoices in batch with cost optimization.

    1. Pre-classify complexity (file size, page count)
    2. Group by model needed
    3. Process Haiku-eligible first (within cache window)
    4. Process Sonnet-eligible second
    """
    results = []

    # Classify by complexity
    simple = [a for a in attachments if is_simple_invoice(a)]
    complex = [a for a in attachments if not is_simple_invoice(a)]

    # Process simple invoices with Haiku (cheapest)
    for attachment in simple:
        result = await parse_with_model(attachment, "claude-3-5-haiku-20241022")
        results.append(result)

    # Process complex invoices with Sonnet
    for attachment in complex:
        result = await parse_with_model(attachment, "claude-sonnet-4-20250514")
        results.append(result)

    return results

def is_simple_invoice(attachment: EmailAttachment) -> bool:
    """Determine if invoice is simple enough for Haiku."""
    # Simple: single page, common format, < 500KB
    file_size = len(base64.b64decode(attachment.content_base64))
    is_small = file_size < 500_000  # 500KB
    is_common_format = attachment.filename.lower().endswith(('.pdf', '.jpg', '.png'))
    return is_small and is_common_format
```

### 4. Fallback Pattern (REQUIRED for Haiku usage)

**Haiku may fail on complex invoices.** Always implement fallback to Sonnet:

```python
async def process_with_fallback(attachment, validate_fn):
    """Try Haiku first, fall back to Sonnet on failure."""
    result = await call_claude("claude-3-5-haiku-20241022", attachment)

    # Fallback conditions: API error, no JSON, invalid data
    if not result.success or not validate_fn(result.data):
        result = await call_claude("claude-sonnet-4-20250514", attachment)

    return result
```

### 5. Result Validation (REQUIRED)

**Never trust OCR output blindly.** Validate required fields:

```python
def validate_invoice_ocr(data: dict) -> tuple[bool, str | None]:
    """Validate OCR result has minimum required fields."""
    # Must have amount
    if not data.get("grossAmount") or data["grossAmount"] <= 0:
        return False, "Missing grossAmount"

    # Must have supplier
    if not data.get("supplier", {}).get("name"):
        return False, "Missing supplier name"

    # Date format check
    if data.get("invoiceDate"):
        try:
            datetime.strptime(data["invoiceDate"], "%Y-%m-%d")
        except ValueError:
            return False, "Invalid date format"

    return True, None
```

### 6. Token Limits (REQUIRED)

Always set `max_tokens` to the minimum needed:

| Task                 | max_tokens |
| -------------------- | ---------- |
| Invoice OCR JSON     | 1024       |
| Simple chat response | 256        |
| Detailed explanation | 512        |
| Complex analysis     | 2048       |

### 7. Response Optimization

````python
# Add stop sequences to prevent over-generation
message = client.messages.create(
    model=model,
    max_tokens=1024,
    stop_sequences=["```", "\n\n\n"],  # Stop after JSON block
    messages=[...]
)
````

### 8. Cost Tracking

Log API costs for monitoring:

```python
# After each API call
input_tokens = message.usage.input_tokens
output_tokens = message.usage.output_tokens
cached_tokens = getattr(message.usage, 'cache_read_input_tokens', 0)

# Calculate cost (update rates as needed)
MODEL_COSTS = {
    "claude-3-5-haiku-20241022": {"input": 0.25, "output": 1.25, "cached": 0.025},
    "claude-sonnet-4-20250514": {"input": 3.0, "output": 15.0, "cached": 0.30},
    "claude-opus-4-5-20251101": {"input": 15.0, "output": 75.0, "cached": 1.50},
}

cost = (
    (input_tokens - cached_tokens) * costs["input"] / 1_000_000 +
    cached_tokens * costs["cached"] / 1_000_000 +
    output_tokens * costs["output"] / 1_000_000
)
print(f"API cost: ${cost:.4f} (cached: {cached_tokens} tokens)")
```

### 9. Thread Safety (REQUIRED for web servers)

**⚠️ DO NOT use global singletons with mutable state for cost tracking.**

```python
# ❌ BAD: Global mutable state causes race conditions
_processor = None
def get_processor():
    global _processor
    if _processor is None:
        _processor = Processor()
    _processor.total_cost = 0  # Race condition!
    return _processor

# ✅ GOOD: Create per-request, return stats in result
async def process_invoices(attachments):
    processor = BatchOCRProcessor()  # Fresh instance
    result = await processor.process_batch(attachments)
    return result  # Stats are in result.total_cost_usd
```

### Reference Implementation

See `backend/services/batch_ocr_processor.py` for the production implementation with all these patterns.

---
