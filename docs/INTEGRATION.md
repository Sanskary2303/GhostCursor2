# 🔌 Ghost Cursor — Integration Guide

> **Total customer changes required: ~61 lines of code (< 1 hour)**
> - **Frontend**: 1 import + 1 JSX component + `data-ghost-id` attributes on key elements (~9 lines)
> - **Backend**: Mount gateway router + register read-only tools (~14 lines)
> - **Database**: Run standard migration `001_ghost_chat_schema.sql` (< 2 mins)

---

## 1. Architecture Topology

Ghost Cursor enforces a strict **Customer Gateway Proxy** topology:

```
[ User Browser ]
      │  Same-origin request (/api/ghost-cursor)
      ▼
[ Customer Backend Gateway ]
      │  Server-to-Server HTTPS (X-Ghost-Key + X-Ghost-Subject)
      ▼
[ Ghost Cursor Cloud (GCP) ]
      │  Google ADK Agentic Tool Loop
      ▼
[ Vertex AI Gemini 2.0 ]
```

**Security Invariant:** The user browser NEVER directly calls Ghost Cursor Cloud or Vertex AI. Private Markdown Brain logic and API keys never touch browser bundles.

---

## 2. Frontend Integration (`@ghost-cursor/sdk`)

### Step 1: Install or Import SDK

```bash
npm install @ghost-cursor/sdk
```

### Step 2: Mount Widget in Root Component (`App.tsx`)

```tsx
import { GhostCursor } from '@ghost-cursor/sdk/react';

export function App() {
  return (
    <div>
      <YourAppRoutes />

      {/* Mount Ghost Cursor co-pilot widget */}
      <GhostCursor
        apiEndpoint="/api/ghost-cursor"
        theme={{
          primaryColor: '#6366f1',
          cursorColor: '#ef4444',
          position: 'bottom-right',
        }}
        requireApprovalForActions={true}
      />
    </div>
  );
}
```

### Step 3: Decorate Interactive Elements with Target IDs

Ghost Cursor resolves targets using the **Element Targeting Cascade**:
1. `data-ghost-id="product.add_to_cart_btn"` (Explicit Logical ID - highest priority)
2. `data-testid="add-to-cart"` (Automated Test ID)
3. `id="add-to-cart-button"` (Standard DOM ID)
4. ARIA labels (`aria-label="Add to cart"`)
5. Semantic visible text

Example:
```tsx
<button
  data-ghost-id="product.add_to_cart_btn"
  onClick={handleAddToCart}
>
  Add to Cart
</button>
```

---

## 3. Backend Integration (`ghost-cursor` Python SDK)

### Step 1: Install Python SDK

```bash
pip install ghost-cursor
```

### Step 2: Mount Gateway Router in FastAPI (`main.py`)

```python
from fastapi import FastAPI, Depends
from ghost_cursor.proxy import GhostCursorBackend
from ghost_cursor.storage import SQLAlchemyChatStore
from ghost_cursor.fastapi import create_ghost_router

app = FastAPI()

# 1. Initialize SDK
ghost = GhostCursorBackend(
    api_key=os.environ["GHOST_CURSOR_API_KEY"],
    tenant_id="your_tenant_id",
    brain_dir="./brain",
    service_url="https://api.ghostcursor.ai",
)

# 2. Attach Customer Database for Chat Sovereignty
chat_store = SQLAlchemyChatStore(db_engine=your_db_engine)
ghost.attach_chat_store(chat_store)

# 3. Mount Routes
app.include_router(create_ghost_router(ghost, get_current_user=get_current_user))
```

### Step 3: Register Read-Only Backend Tools (`ghost_tools.py`)

```python
from pydantic import BaseModel, Field

class OrderQuery(BaseModel):
    order_id: str = Field(description="Order ID to lookup, e.g. SH-1024")

@ghost.register_tool(
    name="lookup_order",
    description="Look up real-time tracking and status for an authenticated user's order",
    schema=OrderQuery,
    read_only=True,
)
async def lookup_order(params: OrderQuery, context: dict):
    user_id = context["user_id"]
    return await db.fetch_order(params.order_id, user_id=user_id)
```

---

## 4. Business Brain Setup

Create a `brain/` directory with plain-English business rules:
- `brain/platform.md`: Global platform context, tax rules, return policies, themes.
- `brain/pages/{page}.md`: Route-specific facts, constraints, and validation logic.

Zero CSS selectors or DOM tags in Brain files.

