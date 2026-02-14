# Python for JavaScript Developers

A crash course for JS/React developers transitioning to Python backend development.
Uses the Ciri codebase as real-world examples throughout.

---

## 1. Python vs JavaScript — Mental Model Shift

```
JS world                          Python world
─────────────────────────────────────────────────
const/let/var                     just assign: x = 5
{}  (objects)                     dict: {"key": "value"}
interface/type                    @dataclass or Pydantic BaseModel
async/await + Promise             async/await + coroutine (same idea)
npm/pnpm                          pip + requirements.txt
node_modules/                     venv/
console.log()                     print() or logging.info()
null / undefined                  None (only one)
true / false                      True / False (capitalized)
=== strict equality               == (always strict, no ===)
camelCase                         snake_case
```

### Key syntax differences

```python
# ─── Variables ───
name = "Henrik"                     # no const/let needed
count: int = 0                      # optional type hint
items: list[str] = ["a", "b"]      # typed list

# ─── Functions ───
def add(a: int, b: int) -> int:    # type hints are optional but recommended
    return a + b

async def fetch_data() -> dict:    # async works the same way
    result = await some_api_call()
    return result

# ─── Classes ───
class User:
    def __init__(self, name: str, age: int):
        self.name = name            # no 'this', use 'self'
        self.age = age

user = User("Henrik", 25)
print(user.name)                    # "Henrik"

# ─── Dataclasses (like TypeScript interfaces but with a constructor) ───
from dataclasses import dataclass

@dataclass
class MaturityReport:
    rule_count: int
    is_mature: bool

report = MaturityReport(rule_count=25, is_mature=True)
print(report.rule_count)            # 25

# ─── Dictionaries (like JS objects) ───
config = {
    "host": "localhost",
    "port": 5432,
}
print(config["host"])               # "localhost"
print(config.get("missing", "default"))  # "default" (safe access)

# ─── List comprehensions (like .map() and .filter() combined) ───
numbers = [1, 2, 3, 4, 5]

# JS:  numbers.map(n => n * 2)
doubled = [n * 2 for n in numbers]              # [2, 4, 6, 8, 10]

# JS:  numbers.filter(n => n > 3)
big = [n for n in numbers if n > 3]             # [4, 5]

# JS:  numbers.filter(n => n > 2).map(n => n * 10)
result = [n * 10 for n in numbers if n > 2]     # [30, 40, 50]

# ─── String formatting ───
name = "Ciri"
version = 2
message = f"Welcome to {name} v{version}"       # f-strings (like template literals)

# ─── Error handling ───
# JS:  try { } catch (e) { } finally { }
try:
    result = 10 / 0
except ZeroDivisionError as e:
    print(f"Error: {e}")
except Exception as e:                          # catch-all (like catch(e))
    print(f"Unexpected: {e}")
finally:
    print("Always runs")

# ─── None checks ───
# JS:  if (value !== null && value !== undefined)
if value is not None:
    print(value)

# JS:  value ?? "default"
result = value if value is not None else "default"
# or simply:
result = value or "default"                     # falsy check (like JS ||)
```

---

## 2. Database — SQLAlchemy (the Python ORM)

Think of SQLAlchemy like **Prisma or Drizzle** but for Python.

### 2.1 Defining a Model

A model maps a Python class to a database table.

```python
# models/bank_account.py
from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from config.database import Base
import uuid

class BankAccount(Base):
    __tablename__ = "bank_accounts"     # actual table name in Postgres

    # Columns
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"))
    bank_name = Column(String(255), nullable=False)
    account_number = Column(String(20))
    current_balance = Column(Numeric(15, 2), default=0)
    is_primary = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships (like Prisma relations)
    transactions = relationship("BankTransaction", back_populates="bank_account")
```

**Column type mapping:**
```
Column(String(255))     →  VARCHAR(255)        →  z.string().max(255)
Column(Numeric(15,2))   →  DECIMAL(15,2)       →  number with 2 decimals
Column(Boolean)         →  BOOLEAN             →  z.boolean()
Column(DateTime)        →  TIMESTAMP           →  Date
Column(UUID)            →  UUID                →  z.string().uuid()
Column(Text)            →  TEXT                →  z.string() (unlimited)
Column(Integer)         →  INTEGER             →  z.number().int()
```

### 2.2 Creating the Database Engine

The engine is your connection pool — like creating a PrismaClient.

```python
# config/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

# Connection string (like DATABASE_URL in Prisma)
DATABASE_URL = "postgresql+asyncpg://ciri:ciri@db:5432/ciri"
#               ^^^^^^^^^ ^^^^^^   ^^^^ ^^^^ ^^ ^^^^ ^^^^
#               driver    async     user pass  host port dbname
#                         adapter

# Engine = connection pool (reuse across requests)
engine = create_async_engine(DATABASE_URL, echo=False)

# Session factory = creates individual "conversations" with the DB
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Base = every model class inherits from this
Base = declarative_base()

# Dependency: FastAPI calls this to give each request its own session
async def get_db():
    async with async_session() as session:
        yield session
        await session.commit()
```

### 2.3 Creating Tables

```python
# In main.py startup
from config.database import engine, Base
import models                        # MUST import all models first!

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # This creates all tables that don't exist yet
        # WARNING: does NOT update existing tables (no migrations)
```

**Important:** `create_all` only creates NEW tables. If you add a column to an existing model, you need to manually run `ALTER TABLE` in psql. There's no automatic migration system (like Prisma migrate) without Alembic.

### 2.4 CRUD Operations

```python
from sqlalchemy import select, and_, or_, func, desc

# ─── READ ONE ───
# JS: const user = await prisma.user.findFirst({ where: { email } })
query = select(User).where(User.email == email)
result = await db.execute(query)
user = result.scalar_one_or_none()    # Returns User or None

# ─── READ MANY ───
# JS: const users = await prisma.user.findMany({ where: { active: true } })
query = select(User).where(User.is_active == True)
result = await db.execute(query)
users = result.scalars().all()        # Returns Sequence[User]

# ─── READ WITH MULTIPLE CONDITIONS ───
# JS: prisma.tx.findMany({ where: { AND: [{ companyId }, { amount: { gt: 1000 } }] } })
query = select(BankTransaction).where(
    and_(
        BankTransaction.company_id == company_id,
        BankTransaction.is_private == False,
        BankTransaction.amount > 1000,
    )
).order_by(desc(BankTransaction.booking_date)).limit(50)

result = await db.execute(query)
transactions = result.scalars().all()

# ─── READ WITH OR ───
query = select(BankTransaction).where(
    or_(
        BankTransaction.raw_description.ilike("%REMA%"),
        BankTransaction.merchant_name.ilike("%REMA%"),
    )
)

# ─── COUNT ───
# JS: const count = await prisma.user.count({ where: { active: true } })
query = select(func.count()).select_from(User).where(User.is_active == True)
result = await db.execute(query)
count = result.scalar_one()           # Returns int

# ─── CREATE ───
# JS: await prisma.user.create({ data: { name: "Henrik", email: "..." } })
user = User(name="Henrik", email="henrik@example.com")
db.add(user)                          # Adds to session (NOT saved yet)
await db.flush()                      # Sends to DB, populates user.id
# user.id is now a real UUID

# ─── CREATE MULTIPLE ───
db.add_all([user1, user2, user3])
await db.flush()

# ─── UPDATE ───
# JS: await prisma.user.update({ where: { id }, data: { name: "New" } })
user.name = "New Name"                # Just modify the attribute
await db.flush()                      # SQLAlchemy tracks dirty objects

# ─── DELETE ───
# JS: await prisma.user.delete({ where: { id } })
await db.delete(user)
await db.commit()
```

### 2.5 The Query Pattern (memorize this)

Every database read follows the same 3-step pattern:

```python
# Step 1: Build the query
query = select(Model).where(Model.field == value)

# Step 2: Execute it
result = await db.execute(query)

# Step 3: Extract results
item = result.scalar_one_or_none()    # single item or None
items = result.scalars().all()        # list of items
first = result.scalars().first()      # first item or None
```

### 2.6 Session Lifecycle

```
db.add(obj)      →  "I want to save this" (queued)
db.flush()       →  "Send to DB NOW" (but can still rollback)
db.commit()      →  "Make it permanent" (no going back)
db.rollback()    →  "Undo everything since last commit"
db.refresh(obj)  →  "Reload this object from DB"
```

Think of it like git:
```
db.add()     =  git add
db.flush()   =  git stash (temporary)
db.commit()  =  git commit + push
db.rollback() = git checkout . (discard changes)
```

---

## 3. FastAPI — The Backend Framework

FastAPI is like **Express.js but with automatic validation, docs, and type safety**.

### 3.1 Basic Endpoint

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()

# ─── Pydantic models (like Zod schemas) ───
class CreateUserRequest(BaseModel):
    name: str
    email: str
    age: int = 25                     # default value

class UserResponse(BaseModel):
    id: str
    name: str
    email: str

# ─── GET endpoint ───
# JS: app.get("/users/:id", (req, res) => { ... })
@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,                              # from URL path (:id in Express)
    include_details: bool = Query(False),      # from ?include_details=true
    db: AsyncSession = Depends(get_db),        # injected DB session
):
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Not found")

    return UserResponse(id=str(user.id), name=user.name, email=user.email)

# ─── POST endpoint ───
# JS: app.post("/users", (req, res) => { const { name, email } = req.body })
@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    request: CreateUserRequest,                # auto-parsed from JSON body
    db: AsyncSession = Depends(get_db),
):
    user = User(name=request.name, email=request.email)
    db.add(user)
    await db.flush()

    return UserResponse(id=str(user.id), name=user.name, email=user.email)
```

### 3.2 Dependency Injection

FastAPI's superpower. Instead of middleware, you declare what each endpoint needs:

```python
# This function runs before every endpoint that uses Depends(get_db)
async def get_db():
    async with async_session() as session:
        yield session
        await session.commit()

# This function gets the current company (reusable across endpoints)
async def get_company_id(db: AsyncSession) -> uuid.UUID:
    query = select(Company).limit(1)
    result = await db.execute(query)
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=400, detail="No company found")
    return company.id

# Use it in any endpoint
@router.get("/transactions")
async def list_transactions(
    db: AsyncSession = Depends(get_db),           # DB session
    company_id: uuid.UUID = Depends(get_company_id),  # auto-resolved
):
    # company_id is already resolved — no need to query again
    query = select(BankTransaction).where(
        BankTransaction.company_id == company_id
    )
    ...
```

**JS equivalent thinking:**
```
Depends(get_db)          →  like Express middleware that adds req.db
Depends(get_company_id)  →  like auth middleware that adds req.user.companyId
raise HTTPException()    →  like throw new Error() + res.status(404)
```

### 3.3 Request/Response Validation

Pydantic models validate input automatically. Invalid data returns 422 with details.

```python
from pydantic import BaseModel, Field, validator
from decimal import Decimal
from typing import Optional

class CreateInvoiceRequest(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=255)
    amount: Decimal = Field(..., gt=0)             # must be positive
    due_date: date
    description: Optional[str] = None
    mva_code: str = Field("25", pattern=r"^(0|12|15|25)$")  # regex validation

    # Custom validation
    @validator("customer_name")
    def clean_name(cls, v):
        return v.strip()
```

If someone sends `{"amount": -100}`, FastAPI auto-returns:
```json
{
  "detail": [{"loc": ["body", "amount"], "msg": "ensure this value is greater than 0"}]
}
```

---

## 4. AI / Machine Learning with Python

Three levels, from easiest to most complex:

### 4.1 Level 1: API Calls (Prompt Engineering)

No training. You send data to Claude/GPT and get answers back.
**This is what Ciri does now.**

```python
import anthropic
import json

client = anthropic.AsyncAnthropic()   # reads ANTHROPIC_API_KEY from env

async def categorize_transaction(description: str, rules: list[dict]) -> str:
    """Ask Claude to categorize a transaction based on rules."""

    prompt = f"""Du er en regnskapsforer. Kategoriser denne transaksjonen.

Regler:
{json.dumps(rules, ensure_ascii=False)}

Transaksjon: {description}

Svar med JSON: {{"category": "...", "account": "...", "confidence": 0.0-1.0}}"""

    message = await client.messages.create(
        model="claude-3-5-haiku-20241022",    # cheapest model
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )

    return json.loads(message.content[0].text)

# Usage
result = await categorize_transaction(
    "REMA 1000 OSLO",
    [{"pattern": "REMA", "category": "VAREKJOP", "account": "4300"}]
)
# → {"category": "VAREKJOP", "account": "4300", "confidence": 0.95}
```

**When to use:** Always start here. Cheapest, simplest, no training data needed.

### 4.2 Level 2: Embeddings + Vector Search (RAG)

Convert text to numbers (vectors), then find similar items.
Good for: "find transactions that look like this one."

```python
# pip install sentence-transformers chromadb
from sentence_transformers import SentenceTransformer
import chromadb

# ─── Step 1: Load a model (downloads ~90MB once) ───
model = SentenceTransformer("all-MiniLM-L6-v2")

# ─── Step 2: Your data ───
transactions = [
    "REMA 1000 OSLO",
    "COOP EXTRA BERGEN",
    "NETFLIX.COM",
    "DNB HUSLAN BETALING",
    "SPOTIFY AB",
    "KIWI MINIPRIS 123",
]
categories = ["VAREKJOP", "VAREKJOP", "KONTOR", "BANK", "KONTOR", "VAREKJOP"]

# ─── Step 3: Convert text → vectors ───
embeddings = model.encode(transactions)
# Each text becomes an array of 384 numbers:
# embeddings[0] = [0.023, -0.156, 0.891, ...] (384 floats)
# Similar texts → similar vectors → close in 384-dimensional space

# ─── Step 4: Store in vector database ───
db = chromadb.Client()
collection = db.create_collection("transactions")
collection.add(
    documents=transactions,
    metadatas=[{"category": c} for c in categories],
    ids=[f"tx_{i}" for i in range(len(transactions))],
)

# ─── Step 5: Search for similar items ───
results = collection.query(
    query_texts=["BUNNPRIS TRONDHEIM"],    # new transaction
    n_results=3,                            # top 3 matches
)
# Returns:
# documents: ["KIWI MINIPRIS 123", "REMA 1000 OSLO", "COOP EXTRA BERGEN"]
# metadatas: [{"category": "VAREKJOP"}, {"category": "VAREKJOP"}, ...]
# distances: [0.45, 0.52, 0.58]  (lower = more similar)

# → All 3 neighbors are VAREKJOP → high confidence it's VAREKJOP
```

**When to use:** When you have 1000+ labeled examples and want fast local matching without API costs.

### 4.3 Level 3: Training a Custom Model (Fine-tuning)

Train a model on YOUR data so it learns your specific patterns.

```python
# pip install transformers datasets torch
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Trainer,
    TrainingArguments,
)
from datasets import Dataset

# ─── Step 1: Prepare labeled data ───
# You need 500+ examples minimum, ideally 5000+
data = {
    "text": [
        "REMA 1000 OSLO",
        "NETFLIX.COM",
        "DNB HUSLAN BETALING",
        "TELENOR NORGE AS",
        "CIRCLE K STATOIL",
        # ... hundreds more
    ],
    "label": [
        0,    # 0 = VAREKJOP
        1,    # 1 = KONTOR
        2,    # 2 = BANK
        1,    # 1 = KONTOR
        3,    # 3 = REISE
        # ... matching labels
    ]
}

# Label mapping
CATEGORIES = {0: "VAREKJOP", 1: "KONTOR", 2: "BANK", 3: "REISE"}

dataset = Dataset.from_dict(data)
dataset = dataset.train_test_split(test_size=0.2)    # 80% train, 20% test

# ─── Step 2: Load pre-trained Norwegian model ───
model_name = "NbAiLab/nb-bert-base"                  # Norwegian BERT
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(
    model_name,
    num_labels=len(CATEGORIES),
)

# ─── Step 3: Tokenize (convert text → numbers) ───
def tokenize(batch):
    return tokenizer(batch["text"], padding=True, truncation=True, max_length=64)

tokenized = dataset.map(tokenize, batched=True)

# ─── Step 4: Train ───
training_args = TrainingArguments(
    output_dir="./model_output",
    num_train_epochs=5,                # how many times to see all data
    per_device_train_batch_size=16,    # process 16 examples at once
    learning_rate=2e-5,                # how fast to learn (small = careful)
    evaluation_strategy="epoch",       # test after each epoch
    save_strategy="epoch",
    load_best_model_at_end=True,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized["train"],
    eval_dataset=tokenized["test"],
)

trainer.train()
# Training output:
# Epoch 1/5: loss=1.23, accuracy=0.45
# Epoch 2/5: loss=0.67, accuracy=0.72
# Epoch 5/5: loss=0.12, accuracy=0.94   ← model learned!

# ─── Step 5: Use the trained model ───
trainer.save_model("./ciri_categorizer")

# Later, load and predict:
from transformers import pipeline

classifier = pipeline(
    "text-classification",
    model="./ciri_categorizer",
    tokenizer=tokenizer,
)

result = classifier("KIWI MINIPRIS TRONDHEIM")
# → [{"label": "LABEL_0", "score": 0.94}]
# LABEL_0 = VAREKJOP → correct!
```

**When to use:** When you have 5000+ labeled transactions and need sub-millisecond local inference.

### 4.4 Which approach for Ciri?

| Approach | Data needed | Cost | Speed | Accuracy |
|---|---|---|---|---|
| **Prompt engineering** | 0 (rules in prompt) | ~$0.001/call | 500ms | Good |
| **Embeddings (RAG)** | 500+ examples | Free (local) | 10ms | Good |
| **Fine-tuned model** | 5000+ examples | Free after training | 1ms | Best |
| **Hybrid: RAG + Claude** | 500+ examples | ~$0.0005/call | 200ms | Great |

**Recommended path for Ciri:**
1. Start with prompt engineering (current approach)
2. When you have 500+ categorized transactions → add RAG for instant matching
3. When you have 5000+ → fine-tune a small model for offline categorization
4. Keep Claude as the fallback for edge cases the model isn't sure about

---

## 5. Practical Exercises

### Exercise 1: Query the database

Create `backend/exercises/ex1_query.py`:

```python
"""Read all bank transactions and group by category."""
import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# TODO: Import the BankTransaction model
# TODO: Create engine with your database URL
# TODO: Query all transactions, group by category, print counts

async def main():
    engine = create_async_engine(
        "postgresql+asyncpg://ciri:ciri@localhost:5432/ciri"
    )
    session_factory = sessionmaker(engine, class_=AsyncSession)

    async with session_factory() as db:
        # Your code here:
        # 1. select(BankTransaction.category, func.count()).group_by(...)
        # 2. Execute and print results
        pass

    await engine.dispose()

asyncio.run(main())
```

### Exercise 2: Create and query

```python
"""Create a reconciliation rule, then query it back."""
import asyncio

async def main():
    # TODO:
    # 1. Connect to database
    # 2. Create a new ReconciliationRule with:
    #    - name: "Test Rule"
    #    - rule_type: RuleType.AUTO_CATEGORY
    #    - criteria: {"description_contains": "REMA"}
    #    - action: {"category": "VAREKJOP", "account": "4300"}
    # 3. Flush to get the ID
    # 4. Query it back by ID
    # 5. Print the rule name and criteria
    # 6. Delete it (cleanup)
    pass

asyncio.run(main())
```

### Exercise 3: Embeddings

```python
"""Build a simple transaction categorizer using embeddings."""
# pip install sentence-transformers

from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

# TODO:
# 1. Create a list of 10 known transactions with categories
# 2. Encode them all as vectors
# 3. Encode a NEW transaction: "MENY STORO OSLO"
# 4. Calculate cosine similarity between the new one and all known ones
# 5. Print the top 3 most similar and their categories
# 6. What category would you assign?

# Hint: cosine similarity
def cosine_sim(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
```

---

## 6. Common Patterns in Ciri's Codebase

### Pattern: Get company, then query scoped data

```python
async def some_endpoint(db: AsyncSession = Depends(get_db)):
    # Step 1: Get company (will be auth-based in production)
    company_id = await get_company_id(db)

    # Step 2: Always scope queries to company
    query = select(SomeModel).where(SomeModel.company_id == company_id)
    result = await db.execute(query)
    items = result.scalars().all()
```

### Pattern: Create with cascade

```python
# Create a parent, flush to get ID, then create children
bilag = Bilag(company_id=company_id, description="Test")
db.add(bilag)
await db.flush()          # bilag.id is now populated

postering = Postering(
    bilag_id=bilag.id,    # use the parent's ID
    account_number="4300",
)
db.add(postering)
await db.commit()         # saves both
```

### Pattern: Conditional query building

```python
# Start with base query, add filters conditionally
query = select(BankTransaction).where(
    BankTransaction.company_id == company_id
)

if category:
    query = query.where(BankTransaction.category == category)
if from_date:
    query = query.where(BankTransaction.booking_date >= from_date)
if search:
    query = query.where(BankTransaction.raw_description.ilike(f"%{search}%"))

query = query.order_by(desc(BankTransaction.booking_date)).limit(50)
```

### Pattern: Enum usage

```python
# Define
import enum

class BilagStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    POSTED = "POSTED"
    REJECTED = "REJECTED"

# Use in model
status = Column(Enum(BilagStatus), default=BilagStatus.PENDING)

# Compare
if bilag.status == BilagStatus.POSTED:
    raise HTTPException(400, "Cannot modify posted bilag")

# Get string value
print(bilag.status.value)    # "POSTED"
```

---

## 7. Running Things

```bash
# ─── Virtual environment ───
cd backend
python3 -m venv venv                  # create (once)
source venv/bin/activate              # activate (every terminal)
pip install -r requirements.txt       # install packages

# ─── Run a script ───
venv/bin/python exercises/ex1_query.py

# ─── Run the server ───
uvicorn main:app --reload             # like 'next dev'

# ─── Docker ───
docker-compose up -d --build backend  # rebuild + restart
docker-compose logs --tail=20 backend # check logs

# ─── Database queries ───
docker exec ciri-db psql -U ciri -d ciri -c "SELECT count(*) FROM bank_transactions"

# ─── Python REPL (interactive) ───
venv/bin/python
>>> from models import BankTransaction
>>> print(BankTransaction.__tablename__)
'bank_transactions'
```

---

## 8. Further Reading

- [FastAPI docs](https://fastapi.tiangolo.com/) — excellent tutorial
- [SQLAlchemy 2.0 tutorial](https://docs.sqlalchemy.org/en/20/tutorial/) — the async section
- [Pydantic docs](https://docs.pydantic.dev/) — validation and serialization
- [Anthropic Python SDK](https://docs.anthropic.com/en/api/client-sdks) — Claude API
- [HuggingFace Transformers](https://huggingface.co/docs/transformers/) — model training
- [Sentence Transformers](https://www.sbert.net/) — embeddings
