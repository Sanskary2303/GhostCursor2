"""ShopHive Customer Backend API.

Integrates Ghost Cursor via the Python Backend SDK (@ghost-cursor/backend).
Serves same-origin API routes to the ShopHive React frontend.
"""

import os
import sys
from pathlib import Path

# Add sdk-server-python to sys.path so ghost_cursor package can be imported directly
SDK_PATH = Path(__file__).resolve().parent.parent.parent.parent / "packages" / "sdk-server-python"
if str(SDK_PATH) not in sys.path:
    sys.path.insert(0, str(SDK_PATH))

from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine
from dotenv import load_dotenv

# =========================================================================
# [GHOST-CURSOR INTEGRATION - STEP 3: INITIALIZE BACKEND SDK & PROXY]
# =========================================================================
from ghost_cursor.proxy import GhostCursorBackend
from ghost_cursor.storage import SQLAlchemyChatStore
from ghost_cursor.fastapi import create_ghost_router
from tools.ghost_tools import register_shophive_tools

load_dotenv()

app = FastAPI(title="ShopHive Backend API", version="1.0.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Initialize customer local database engine for chat history
DB_PATH = Path(__file__).resolve().parent / "shophive_customer.db"
db_engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
chat_store = SQLAlchemyChatStore(db_engine=db_engine)

# 2. Initialize Ghost Cursor with tenant credentials and markdown brain directory
ghost = GhostCursorBackend(
    api_key=os.getenv("GHOST_CURSOR_API_KEY", "dev-test-key-minimum-32-characters-long"),
    tenant_id=os.getenv("GHOST_CURSOR_TENANT_ID", "shophive_demo"),
    brain_dir=str(Path(__file__).resolve().parent / "brain"),
    service_url=os.getenv("GHOST_CURSOR_SERVICE_URL", "http://localhost:8080"),
)

# Attach customer DB store for chat data sovereignty
ghost.attach_chat_store(chat_store)

# Register customer-specific read-only backend tools
register_shophive_tools(ghost)


# 3. Simple customer auth mock
class CurrentCustomer:
    id: str = "cust_shophive_4481"
    email: str = "customer@example.com"
    name: str = "Alex Mercer"


async def get_current_user(request: Request) -> CurrentCustomer:
    return CurrentCustomer()


# =========================================================================
# [GHOST-CURSOR INTEGRATION - STEP 4: WIRE THE PROXY GATEWAY ROUTES]
# =========================================================================
ghost_router = create_ghost_router(ghost, get_current_user=get_current_user)
app.include_router(ghost_router)


# ---------------------------------------------------------------------------
# Additional Customer Shop Endpoints
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "app": "shophive-backend"}


@app.get("/api/products")
async def get_products():
    return {"status": "ok", "count": 6}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8081, reload=True)

