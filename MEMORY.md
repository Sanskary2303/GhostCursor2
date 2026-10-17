# MEMORY.md — Ghost Cursor Master Implementation Log

## Project Status: ✅ Core Baseline & Full Architecture Implemented

## 1. Master Architecture Decisions
- **ADR-001:** Python 3.12 + FastAPI for orchestrator (`services/orchestrator`)
- **ADR-002:** GCP Cloud Run container deployment (zero cluster overhead, autoscale 0-5)
- **ADR-003:** Google ADK Agentic loop with Gemini 2.0 Flash/Pro via Vertex AI
- **ADR-005:** Customer Gateway Proxy — zero browser direct access, keys remain server-side
- **ADR-007:** Shadow DOM sandboxing for Chat Widget & Tour Overlay (100% CSS encapsulation)
- **ADR-008:** Modular Monolith container on Cloud Run (zero inter-service latency)
- **ADR-009:** Element Targeting Cascade (data-ghost-id → testid → id → aria → visible text)
- **ADR-011:** Gateway Reverse-Dispatch for read-only customer backend tools (`X-Ghost-Subject`)
- **ADR-012:** Customer Database Ownership for chat history & audit logging (`SQLAlchemyChatStore`)

## 2. Invariants & Security Boundaries
- Protocol Version: literal `"1"`
- Run Expiry: 30 minutes, max 12 continuation turns
- Canary Marker: `GHOST_BRAIN_SERVER_ONLY_CANARY_2026` (verified with leak detection filter)
- Hosted Request Body: Capped at 64 KiB
- Tool Output Bound: 16,000 characters
- Brain Context Bound: 32,000 characters
- Optimistic Concurrency: Strict revision locking (`409 Conflict` on mismatch)
- Identical Replay Deduplication: Supported on start (`requestId`) and events (`eventId`)

## 3. Implemented File Inventory
```
ghost-cursor/
  packages/
    sdk-frontend/                  # @ghost-cursor/sdk (TypeScript / Shadow DOM)
      src/
        index.ts                   # Public API export
        types.ts                   # Canonical protocol types & interfaces
        ghost-cursor.ts            # Main co-pilot orchestrator
        core/
          api-client.ts            # Gateway HTTP client (64KiB bound)
          context-provider.ts      # Reactive DOM scanner (MutationObserver)
          target-resolver.ts       # 5-level Element Targeting Cascade (8s timeout)
          cursor-engine.ts         # GPU-accelerated animated ghost cursor & spotlight
          tour-engine.ts           # Multi-step spotlight walkthrough engine
          executor/
            native-setter.ts       # Framework-safe prototype setters (React 18/19)
            action-executor.ts     # Deterministic sequential action dispatcher
        ui/
          widget.ts                # Custom Element chat widget with Shadow DOM
          styles.ts                # Scoped CSS styles & animations
        react/
          index.tsx                # SSR-safe React component (<GhostCursor />)
    sdk-server-python/             # ghost-cursor (Python Backend SDK)
      ghost_cursor/
        __init__.py
        models.py                  # Strict Pydantic models & validation
        brain_loader.py            # Dynamic platform.md + {page}.md resolution
        storage.py                 # SQLAlchemyChatStore customer DB adapter
        proxy.py                   # GhostCursorBackend reverse-dispatch & proxy
        fastapi.py                 # Ready-to-mount FastAPI router factory
        manager.py                 # Turn logging and auto-summarization
  services/
    orchestrator/                  # Ghost Cursor Cloud (Python 3.12 / FastAPI)
      Dockerfile
      requirements.txt
      app/
        main.py                    # Health, Bearer auth, security middleware
        agent.py                   # Google ADK agent definition & MockAgentProvider
        models.py                  # Hosted protocol schemas & validators
        run_manager.py             # Run state machine (create/continue/expire)
        storage/
          base.py                  # Abstract RunStore
          memory.py                # MemoryRunStore for testing
          postgres.py              # PostgresRunStore with SELECT FOR UPDATE
        llm/
          provider.py              # LLMProvider interface & mock implementation
        tools/
          frontend_tools.py        # Fixed frontend action tool declarations
  demo/
    shophive/                      # Showcase Customer E-Commerce Store
      frontend/                    # React 18 + Vite + TailwindCSS
        src/
          App.tsx                  # Root layout with <GhostCursor /> widget (~9 lines)
          components/NavigationHeader.tsx
          data/products.ts         # 6 sneaker products with mock specs
          data/orders.ts           # Order history including SH-1024
          context/CartContext.tsx  # React cart state provider
          pages/
            Catalog.tsx            # Product grid with data-ghost-id attributes
            ProductDetail.tsx      # Sizing selector & Add to Cart
            Cart.tsx               # Quantities, totals, promo code input
            Checkout.tsx           # Shipping address auto-filling form
            Orders.tsx             # Shipment tracking & return walkthrough
            Settings.tsx           # Light/dark mode appearance toggle
      backend/                     # FastAPI customer backend
        main.py                    # Gateway proxy router (~14 lines)
        requirements.txt
        Dockerfile
        tools/ghost_tools.py       # lookup_order, check_warehouse_stock, simulate_discount_roi
        brain/
          platform.md              # Global platform rules & canary marker
          pages/
            products.md, checkout.md, settings.md, orders.md, dashboard.md, cart.md
        migrations/
          001_ghost_chat_schema.sql # Standard customer DB chat history DDL
  docs/
    INTEGRATION.md                 # 61-line minimal integration guide
    PROVIDERS.md                   # Google ADK & Vertex AI Gemini 2.0 specs
    GCP.md                         # Cloud Run & VPC deployment architecture
    OPERATIONS.md                  # Health checks, canary alerts & runbooks
  infra/
    main.tf                        # Terraform GCP Cloud Run & VPC definitions
    variables.tf, outputs.tf
  docker-compose.yml               # Local multi-service orchestration
```

## 4. Verification & Testing Status
- ✅ RunManager state machine test suite (`test_run_manager.py`)
- ✅ BrainLoader traversal protection & canary verification (`test_brain_loader.py`)
- ✅ Customer gateway proxy & leak filtering tests (`test_proxy.py`)
- 🔄 Unit test execution underway via pytest
