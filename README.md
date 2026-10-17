# 👻 Ghost Cursor

**Application-Aware Autonomous AI Co-pilot as a Service**

Ghost Cursor transforms passive website chatbots into **active, screen-aware autonomous co-pilots**. It does not simply answer questions by outputting walls of text — it **navigates the website, selects items, fills forms, executes multi-step workflows, runs guided interactive tours, and asks clarifying questions**, all with explicit user approval and a visible on-screen animated cursor.

Ghost Cursor is offered as a B2B SaaS platform that any web application (e-commerce, SaaS, fintech dashboards, streaming platforms) can integrate with **minimal code changes** (~61 lines of code, < 1 hour of developer effort) using our **Frontend SDK** and **Backend SDK**.

---

## 📑 Table of Contents

1. [Key Features & Capabilities](#-key-features--capabilities)
2. [Master Architecture & Core Invariants](#-master-architecture--core-invariants)
3. [Repository Directory Structure](#-repository-directory-structure)
4. [Local Setup Guide (Step-by-Step)](#-local-setup-guide-step-by-step)
   - [Prerequisites](#1-prerequisites)
   - [Virtual Environment Setup (Python)](#2-virtual-environment-setup-python)
   - [Installing Dependencies](#3-installing-dependencies)
   - [Environment Configuration (.env)](#4-environment-configuration-env)
5. [Running the Application Locally](#-running-the-application-locally)
   - [Option A: Running Services Manually (Recommended for Dev)](#option-a-running-services-manually)
   - [Option B: Running via Docker Compose](#option-b-running-via-docker-compose)
6. [Switching from Mock Provider to Real Google Cloud Vertex AI (Gemini 2.0)](#-switching-to-real-google-cloud-vertex-ai-gemini-20)
   - [GCP Credentials & Keys Required](#1-gcp-credentials--keys-required)
   - [How to Authenticate with Vertex AI](#2-how-to-authenticate-with-vertex-ai)
   - [Enabling Vertex AI Mode](#3-enabling-vertex-ai-mode)
7. [Deploying to Google Cloud Platform (GCP)](#-deploying-to-google-cloud-platform-gcp)
   - [GCP Managed Architecture](#1-gcp-managed-architecture)
   - [Deploying Cloud Run Services via gcloud](#2-deploying-cloud-run-services-via-gcloud)
   - [Infrastructure as Code with Terraform](#3-infrastructure-as-code-with-terraform)
8. [Customer Showcase Demo: ShopHive](#-customer-showcase-demo-shophive)
   - [Interactive Demo Scenarios](#interactive-demo-scenarios)
   - [Customer Integration Code Delta Audit](#customer-integration-code-delta-audit)
9. [Running Tests & Quality Assurance](#-running-tests--quality-assurance)

---

## 🌟 Key Features & Capabilities

| Feature | Description | Demo Verification |
|---|---|---|
| 🖥️ **Screen-Aware Guidance** | The AI inspects the active DOM, route, and inputs to answer context-specific questions rather than reciting static documentation. | User asks *"What sizes are in stock?"* on a product page → Co-pilot reads available sizes directly from the active screen. |
| 🎯 **AI Cursor Auto-Actions** | Emits structured, validated tool actions (`navigate`, `click`, `fill_input`, `toggle_switch`) that animate a visible on-screen ghost pointer. | User says *"Add the Air Max 90 in size 10 to my cart"* → Cursor smoothly animates to size 10, clicks it, and clicks *Add to Cart*. |
| ❓ **Smart Clarifying Questions** | Detects ambiguities or missing form fields and prompts the user with selectable option cards before taking action. | User says *"I want to checkout"* without an address → Co-pilot prompts: *"Which shipping address should I use?"* |
| 🎬 **Guided Explainers** | Highlights elements with dark cutout polygon overlays and narrates walkthroughs step-by-step. | User asks *"How do I track my return?"* → Co-pilot runs an interactive 3-step tour spotlighting the orders nav and tracking link. |
| 🔒 **Backend Tools via Gateway Loopback** | Executes customer read-only APIs (`lookup_order`, `check_warehouse_stock`, `simulate_discount_roi`) without exposing customer databases. | User asks *"Where is order SH-1024?"* → Orchestrator requests data from the customer gateway under the user's authentic session (`X-Ghost-Subject`). |
| 🛡️ **Customer Data Sovereignty** | Ghost Cursor Cloud is a stateless reasoning engine. Chat sessions and message transcripts reside strictly in the customer's own database. | Customer uses `SQLAlchemyChatStore` to store session records inside their PostgreSQL / SQLite database. |

---

## 📐 Master Architecture & Core Invariants

```text
┌─────────────────────────────────────────────────────────────┐
│ Customer Web Application (User's Browser)                   │
│   ├── Host Application UI (React 18 / Vite / Tailwind)      │
│   └── @ghost-cursor/sdk (Shadow DOM Widget + AI Cursor)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Same-origin request / WebSocket
                               │ Existing user session & CSRF cookies
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Customer Backend Gateway SDK (ghost-cursor Python)          │
│   ├── Validates user session & injects X-Ghost-Subject      │
│   ├── Dynamic Brain Loader (platform.md + {page}.md)        │
│   ├── Executes Local Read-Only Tools (lookup_order, etc.)   │
│   └── Persists Chat History in Customer DB (SQLAlchemy)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Server-to-Server HTTPS
                               │ Bearer API Key + X-Ghost-Subject
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Ghost Cursor Cloud Orchestrator (Google Cloud Platform)     │
│   ├── Cloud Run: Python 3.12 (FastAPI + Google ADK)         │
│   ├── Google ADK Agent: Tool-calling with Gemini 2.0 Flash  │
│   └── Ephemeral Run State: 30-min TTL, Revision Locking     │
└─────────────────────────────────────────────────────────────┘
```

### Strict Architectural Boundaries:
1. **Zero Browser-Direct Access:** The browser NEVER communicates directly with Ghost Cursor Cloud or Vertex AI. Private keys and Brain documents never touch client bundles.
2. **AI Plans; Frontend Deterministically Executes:** The LLM does not write custom DOM scripts. It emits typed tool calls with validated target IDs. The frontend SDK deterministically executes them using the **Element Targeting Cascade** (`data-ghost-id` → `data-testid` → `id` → `aria-label` → visible text).
3. **Pure Business Context in Brain:** Markdown Brain files contain **zero HTML tags or DOM selectors**.
4. **Customer Data Sovereignty:** Chat histories and messages are maintained in the customer's database. Ghost Cloud maintains only ephemeral run states (auto-expired after 30 minutes).
5. **Approval-First Execution:** Action sequences require explicit user confirmation (*"Approve and Run"*) before any DOM mutation occurs.
6. **Canary Leak Detection Filter:** All internal Brain documents embed `GHOST_BRAIN_SERVER_ONLY_CANARY_2026`. The gateway scans all outgoing responses and blocks any containing the canary.

---

## 📁 Repository Directory Structure

```text
ghost-cursor/
├── packages/
│   ├── sdk-frontend/                  # @ghost-cursor/sdk (TypeScript)
│   │   ├── src/
│   │   │   ├── index.ts               # SDK public entrypoint
│   │   │   ├── types.ts               # Protocol interfaces & configurations
│   │   │   ├── ghost-cursor.ts        # Main co-pilot orchestrator
│   │   │   ├── core/
│   │   │   │   ├── api-client.ts      # Gateway client with 64 KiB bound
│   │   │   │   ├── context-provider.ts# Reactive DOM scanner (MutationObserver)
│   │   │   │   ├── target-resolver.ts # 5-level Element Targeting Cascade
│   │   │   │   ├── cursor-engine.ts   # Animated SVG ghost pointer & spotlight
│   │   │   │   ├── tour-engine.ts     # Guided tour spotlight walkthrough
│   │   │   │   └── executor/
│   │   │   │       ├── native-setter.ts   # Framework-safe prototype setters (React 18/19)
│   │   │   │       └── action-executor.ts # Sequential action execution dispatcher
│   │   │   ├── ui/
│   │   │   │   ├── widget.ts          # Custom Element chat UI in Shadow DOM
│   │   │   │   └── styles.ts          # Scoped CSS styles & animations
│   │   │   └── react/
│   │   │       └── index.tsx          # SSR-safe React wrapper (<GhostCursor />)
│   │   └── package.json
│   │
│   └── sdk-server-python/             # ghost-cursor (Customer Backend Python SDK)
│       ├── ghost_cursor/
│       │   ├── __init__.py
│       │   ├── brain_loader.py        # Dynamic platform.md + {page}.md resolver
│       │   ├── storage.py             # SQLAlchemyChatStore customer DB adapter
│       │   ├── proxy.py               # GhostCursorBackend reverse-dispatch & proxy
│       │   ├── fastapi.py             # Ready-to-mount FastAPI router factory
│       │   ├── manager.py             # Turn logging & auto-summarization
│       │   └── models.py              # Pydantic validation models
│       ├── tests/                     # SDK test suite (Canary, Brain, Proxy)
│       └── pyproject.toml
│
├── services/
│   └── orchestrator/                  # Ghost Cursor Cloud (Python 3.12 / FastAPI + ADK)
│       ├── app/
│       │   ├── main.py                # FastAPI app with security middleware & auth
│       │   ├── agent.py               # Google ADK Agent & MockAgentProvider
│       │   ├── run_manager.py         # Run state machine (create/continue/expire)
│       │   ├── models.py              # Protocol version "1" Pydantic schemas
│       │   ├── storage/               # MemoryRunStore & PostgresRunStore
│       │   ├── llm/                   # VertexAILLMProvider & MockLLMProvider
│       │   └── tools/                 # Fixed frontend action tool declarations
│       ├── tests/                     # Orchestrator test suite
│       ├── Dockerfile
│       ├── requirements.txt
│       └── .env.example
│
├── demo/
│   └── shophive/                      # Showcase Customer E-Commerce Store
│       ├── frontend/                  # React 18 + Vite + TailwindCSS
│       │   ├── src/
│       │   │   ├── App.tsx            # Root app layout + <GhostCursor /> widget (~9 lines)
│       │   │   ├── components/        # NavigationHeader with data-ghost-nav
│       │   │   ├── context/           # CartContext for shopping state
│       │   │   ├── data/              # Mock products & orders (includes SH-1024)
│       │   │   └── pages/             # Catalog, ProductDetail, Cart, Checkout, Orders, Settings
│       │   └── package.json
│       └── backend/                   # Customer Backend Gateway (FastAPI)
│           ├── main.py                # Mounts GhostCursorBackend (~14 lines)
│           ├── tools/ghost_tools.py   # lookup_order, check_stock, simulate_discount_roi
│           ├── brain/                 # platform.md + 6 page-specific markdown files
│           ├── migrations/            # 001_ghost_chat_schema.sql
│           ├── requirements.txt
│           ├── Dockerfile
│           └── .env.example
│
├── docs/                              # Detailed Documentation Guides
│   ├── INTEGRATION.md                 # 61-line customer integration guide
│   ├── PROVIDERS.md                   # Google ADK & Vertex AI Gemini 2.0 specifications
│   ├── GCP.md                         # Google Cloud Run & VPC production architecture
│   └── OPERATIONS.md                  # Health monitoring, run state TTL, canary runbook
│
├── infra/                             # Terraform Production Foundation
│   ├── main.tf                        # Cloud Run, VPC, and Secret Manager definitions
│   ├── variables.tf
│   └── outputs.tf
│
├── docker-compose.yml                 # Local multi-container development setup
├── MEMORY.md                          # Architecture decision log (ADRs)
└── README.md                          # Master Setup & Deployment Guide (This file)
```

---

## 💻 Local Setup Guide (Step-by-Step)

### 1. Prerequisites

Ensure you have the following installed on your machine:
- **Python 3.10+** (Python 3.12 recommended): `python --version`
- **Node.js 18+** (Node 20 or 22 recommended): `node --version`
- **npm 9+**: `npm --version`
- **Git**: `git --version`

---

### 2. Virtual Environment Setup (Python)

It is strongly recommended to use a Python virtual environment to manage dependencies cleanly.

#### On Windows (PowerShell):
```powershell
# Navigate to the project root
cd c:\Users\saini\Desktop\ghost-cursor

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.venv\Scripts\Activate.ps1

# If execution of scripts is disabled, run:
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### On Windows (Command Prompt):
```cmd
python -m venv .venv
.venv\Scripts\activate.bat
```

#### On macOS / Linux:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

### 3. Installing Dependencies

#### A. Install Python Dependencies
With your virtual environment active, install requirements for the **Cloud Orchestrator**, the **Python Backend SDK**, and the **ShopHive Demo Backend**:

```bash
# 1. Install dependencies for Ghost Cursor Cloud Orchestrator
pip install -r services/orchestrator/requirements.txt

# 2. Install Python Backend SDK in editable mode
pip install -e packages/sdk-server-python

# 3. Install dependencies for ShopHive Customer Backend
pip install -r demo/shophive/backend/requirements.txt

# 4. Install greenlet, pytest & pytest-asyncio for testing
pip install greenlet pytest pytest-asyncio
```

#### B. Install Frontend Node Dependencies

```bash
# Install dependencies for the ShopHive Demo React Frontend
cd demo/shophive/frontend
npm install
cd ../../../
```

---

### 4. Environment Configuration (`.env`)

#### A. Configure the Cloud Orchestrator (`services/orchestrator/.env`):
Create `services/orchestrator/.env` (or copy from `services/orchestrator/.env.example`):

```ini
PORT=8080

# Provider mode: "mock" (offline default) or "vertex" (Google Cloud Vertex AI)
LLM_PROVIDER=mock

# Development API Key (minimum 32 characters)
GHOST_DEV_API_KEY=dev-test-key-minimum-32-characters-long
GHOST_DEV_TENANT_ID=shophive_demo

# Google Cloud Settings (used when LLM_PROVIDER=vertex)
GCP_PROJECT=your-gcp-project-id
GCP_REGION=us-central1
GEMINI_MODEL=gemini-2.0-flash
```

#### B. Configure the ShopHive Customer Backend (`demo/shophive/backend/.env`):
Create `demo/shophive/backend/.env` (or copy from `demo/shophive/backend/.env.example`):

```ini
GHOST_CURSOR_API_KEY=dev-test-key-minimum-32-characters-long
GHOST_CURSOR_SERVICE_URL=http://localhost:8080
GHOST_CURSOR_TENANT_ID=shophive_demo
```

---

## 🚀 Running the Application Locally

### Option A: Running Services Manually

To run Ghost Cursor in local development, open **three terminal windows** (ensure your virtual environment `.venv` is active in each Python terminal):

#### Terminal 1: Ghost Cursor Cloud Orchestrator (Port 8080)
```powershell
# Windows PowerShell
$env:PYTHONPATH = "services/orchestrator"
uvicorn app.main:app --port 8080 --reload
```
*Health check URL:* [http://localhost:8080/health](http://localhost:8080/health)

#### Terminal 2: ShopHive Customer Backend Gateway (Port 8081)
```powershell
# Windows PowerShell
$env:PYTHONPATH = "packages/sdk-server-python;demo/shophive/backend"
python demo/shophive/backend/main.py
```
*Backend health check:* [http://localhost:8081/health](http://localhost:8081/health)

#### Terminal 3: ShopHive Customer React Frontend (Port 3000)
```cmd
cd demo\shophive\frontend
npm run dev
```
*Frontend URL:* [http://localhost:3000](http://localhost:3000)

Open **[http://localhost:3000](http://localhost:3000)** in your web browser. You will see the ShopHive storefront with the floating Ghost Cursor 👻 widget in the bottom-right corner!

---

### Option B: Running via Docker Compose

You can launch both backend services with a single command using Docker:

```bash
docker compose up --build
```
- Orchestrator available at `http://localhost:8080`
- ShopHive backend available at `http://localhost:8081`

Then start the frontend using `npm run dev -- --port 3000` in `demo/shophive/frontend`.

---

## ⚡ Switching to Real Google Cloud Vertex AI (Gemini 2.0)

By default, Ghost Cursor runs with `LLM_PROVIDER=mock`, which utilizes the built-in deterministic `MockAgentProvider`. This guarantees **100% of all features work out-of-the-box offline** without requiring GCP billing or API keys.

When you are ready to switch to live inference using **Vertex AI Gemini 2.0 Flash / Pro**, follow these steps:

### 1. GCP Credentials & Keys Required

You will need:
1. A **Google Cloud Platform (GCP) Project** with billing enabled.
2. The **Vertex AI API** enabled on your project:
   ```bash
   gcloud services enable aiplatform.googleapis.com
   ```
3. Your **GCP Project ID** (e.g. `my-hackathon-project-12345`).

---

### 2. How to Authenticate with Vertex AI

Choose **one** of the following authentication methods:

#### Method A: Google Application Default Credentials (Recommended for Local Dev)
Run the Google Cloud CLI command on your machine:
```bash
gcloud auth application-default login
```
This writes local credentials that the Google ADK and Vertex AI Python SDK detect automatically without needing any JSON key files.

#### Method B: Service Account JSON Key
1. In the GCP Console, navigate to **IAM & Admin > Service Accounts**.
2. Create a service account with the role **Vertex AI User** (`roles/aiplatform.user`).
3. Create and download a JSON key file (e.g. `gcp-credentials.json`).
4. Set the environment variable in your terminal or in `services/orchestrator/.env`:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\gcp-credentials.json"
   ```

#### Method C: Direct Gemini API Key (Google AI Studio)
If you prefer using a Google AI Studio API key instead of full GCP project credentials, obtain a key from [Google AI Studio](https://aistudio.google.com/) and set:
```ini
GEMINI_API_KEY=AIzaSy...
```

---

### 3. Enabling Vertex AI Mode

Edit `services/orchestrator/.env` and update the settings:

```ini
# 1. Switch provider from "mock" to "vertex"
LLM_PROVIDER=vertex

# 2. Set your Google Cloud Project details
GCP_PROJECT=your-actual-gcp-project-id
GCP_REGION=us-central1
GEMINI_MODEL=gemini-2.0-flash
```

Restart the Orchestrator service:
```powershell
$env:PYTHONPATH = "services/orchestrator"
uvicorn app.main:app --port 8080 --reload
```
You will see the startup log:
```text
INFO: Ghost Cursor Orchestrator started (Store: MemoryStore, Provider: VertexAILLMProvider)
```
Ghost Cursor is now reasoning with live **Gemini 2.0 Flash** via Google Vertex AI!

---

## ☁️ Deploying to Google Cloud Platform (GCP)

### 1. GCP Managed Architecture

Ghost Cursor is architected specifically for Google Cloud managed serverless services:
- **Cloud Run (Serverless Monolith):** Hosts both the `ghost-cursor-api` orchestrator and the `shophive-demo` application. Scales to zero when idle ($0 idle cost) and scales up to handle user traffic with native HTTP/2 and WebSocket support.
- **Vertex AI (Gemini 2.0 Flash):** Sub-second agentic tool calling and reasoning with 1M+ token context window.
- **Secret Manager:** Stores tenant API keys and database credentials securely.
- **Cloud Storage + Cloud CDN:** Serves the compiled `@ghost-cursor/sdk` JavaScript distribution.
- **Cloud SQL for PostgreSQL 17 (Production):** Authoritative run state with row-level revision locking via Direct VPC Egress.

---

### 2. Deploying Cloud Run Services via `gcloud`

Ensure you are logged into GCP:
```bash
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID
```

#### Step 1: Deploy Ghost Cursor Cloud Orchestrator
```bash
gcloud run deploy ghost-cursor-api \
    --source ./services/orchestrator \
    --region us-central1 \
    --set-env-vars "GCP_PROJECT=YOUR_GCP_PROJECT_ID,LLM_PROVIDER=vertex,GEMINI_MODEL=gemini-2.0-flash,GHOST_DEV_API_KEY=your-production-secret-key-min-32-chars,GHOST_DEV_TENANT_ID=shophive_demo" \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 5 \
    --memory 1Gi \
    --cpu 1
```

Note the output Service URL (e.g. `https://ghost-cursor-api-xyz-uc.a.run.app`).

#### Step 2: Deploy ShopHive Customer Demo App
```bash
gcloud run deploy shophive-demo \
    --source . \
    --region us-central1 \
    --set-env-vars "GHOST_CURSOR_API_KEY=your-production-secret-key-min-32-chars,GHOST_CURSOR_SERVICE_URL=https://ghost-cursor-api-xyz-uc.a.run.app,GHOST_CURSOR_TENANT_ID=shophive_demo" \
    --allow-unauthenticated \
    --min-instances 0 \
    --max-instances 1 \
    --memory 1Gi \
    --cpu 1
```

#### Step 3: Publish SDK to Cloud Storage CDN
```bash
gsutil mb -l us-central1 gs://ghost-cursor-sdk-distribution/
gsutil cp packages/sdk-frontend/dist/ghost-cursor.min.js gs://ghost-cursor-sdk-distribution/v1/
gsutil iam ch allUsers:objectViewer gs://ghost-cursor-sdk-distribution
```

---

### 3. Infrastructure as Code with Terraform

A complete Terraform foundation is provided in the `infra/` directory:

```bash
cd infra
terraform init
terraform plan -var="project_id=YOUR_GCP_PROJECT_ID" -var="region=us-central1"
terraform apply -var="project_id=YOUR_GCP_PROJECT_ID" -var="region=us-central1"
```

This provisions the VPC subnet, Secret Manager secret containers, and Cloud Run service definitions with least-privilege IAM roles.

---

## 👟 Customer Showcase Demo: ShopHive

**ShopHive** is a production-grade footwear and athletic apparel demo store built with React 18, Vite, and TailwindCSS that demonstrates 100% of Ghost Cursor's features in an authentic domain.

### Interactive Demo Scenarios

Once the app is running at `http://localhost:3000`, open the Ghost Cursor chat widget (click the 👻 button in the bottom right corner) and try these prompts:

#### 1. AI Cursor Auto-Action: Add to Cart
> **User Prompt:** *"Add the Air Max 90 in size 10 to my cart"*
- **Agent Reasoning:** Navigates to `/product/air-max-90`, identifies size 10 (`product.size.10`), and targets Add to Cart (`product.add_to_cart_btn`).
- **User Action:** Review the proposed action card and click **"Approve and Run"**.
- **Execution:** Watch the animated Ghost Cursor glide across the screen, highlight size 10, trigger a native React click, and click Add to Cart. The cart badge in the header animates from 0 to 1!

#### 2. Screen-Aware Guidance: Inventory Check
> **User Prompt:** *"What sizes are available for this shoe?"*
- **Agent Reasoning:** Context Provider scans active DOM targets on the Product Detail page.
- **Reply:** Co-pilot lists the exact stock sizes (7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13) and asks if you'd like one added.

#### 3. Smart Clarifying Question: Shipping Address
> **User Prompt:** *"I want to checkout"*
- **Agent Reasoning:** Co-pilot detects checkout intent but notes no shipping address is pre-selected.
- **Clarification:** Co-pilot presents interactive selection buttons:
  - `[123 Main St, New York, NY 10001 (saved)]`
  - `[Enter a new address]`
- Selecting the saved address navigates to `/checkout` and auto-fills the shipping form.

#### 4. Customer Read-Only Tools (Gateway Loopback): Order Tracking
> **User Prompt:** *"Where is order SH-1024?"*
- **Agent Reasoning:** Calls the customer-registered tool `lookup_order(order_id="SH-1024")`.
- **Loopback Execution:** Customer gateway verifies the authenticated user (`X-Ghost-Subject`), queries the local database, and returns real-time tracking data (`FedEx Express`, status `Shipped`, delivery `October 28`).

#### 5. Guided Explainer: Visual Spotlight Tour
> **User Prompt:** *"How do I track my return?"*
- **Execution:** Launches the Guided Tour Engine. Dark overlay appears with a spotlight cutout highlighting:
  1. Orders Navigation (`nav.orders`) → *"Click Orders in the navigation bar"*
  2. Order item card (`orders.item.SH-1024`) → *"Here's your most recent order"*
  3. Tracking Link (`orders.tracking_link`) → *"Click this link for live carrier tracking"*

#### 6. Settings Automation: Switch to Dark Mode
> **User Prompt:** *"Turn the appearance to dark mode"*
- **Execution:** Navigates to `/settings`, animates to the theme toggle (`settings.theme_toggle`), flips the switch, and the entire app switches to Dark Mode.

---

### Customer Integration Code Delta Audit

Showcasing how clean the integration is for real-world customers:

| Component | Files Touched / Created | Customer Changes Required | Dev Effort |
|---|---|---|---|
| **Frontend Widget** | `App.tsx` | 1 import + 1 `<GhostCursor />` component | ~9 lines |
| **DOM Target Annotations** | `ProductDetail.tsx`, `Checkout.tsx`, `Settings.tsx` | Add `data-ghost-id` attributes to buttons/inputs | ~10 mins |
| **Backend Gateway** | `main.py` | Mount `create_ghost_router` proxy router | ~14 lines |
| **Backend Tools** | `tools/ghost_tools.py` | Register read-only functions with `@ghost.register_tool` | ~38 lines |
| **Chat DB Persistence** | `migrations/001_ghost_chat_schema.sql` | Run standard SQL schema creation script | < 2 mins |
| **Business Brain** | `brain/platform.md`, `brain/pages/*.md` | Write plain-English business rules (no HTML/CSS) | ~15 mins |
| **Total Customer Delta** | **3 files modified, 3 files created** | **~61 lines of code + standard migration** | **< 1 hour** |

---

## 🧪 Running Tests & Quality Assurance

All test suites verify protocol adherence, revision locking, deduplication, canary leak protection, and brain path traversal defenses.

With your Python virtual environment active:

```powershell
# Windows PowerShell: Run all test suites
$env:PYTHONPATH = "packages/sdk-server-python;services/orchestrator"
python -m pytest packages/sdk-server-python/tests services/orchestrator/tests -v
```

```bash
# macOS / Linux
PYTHONPATH="packages/sdk-server-python:services/orchestrator" python -m pytest packages/sdk-server-python/tests services/orchestrator/tests -v
```

### Verified Test Cases:
- `test_brain_loader_platform_and_page`: Verifies dynamic assembly of `platform.md` and `{page}.md`.
- `test_brain_loader_path_traversal_defense`: Verifies rejection of directory traversal (`../../etc/passwd`).
- `test_canary_leak_filtering`: Verifies that the gateway blocks any response containing the test canary `GHOST_BRAIN_SERVER_ONLY_CANARY_2026`.
- `test_tool_calls_never_reach_public_envelope`: Verifies internal tool calls are completely stripped before reaching the browser.
- `test_create_run_and_deduplication`: Verifies identical starts replay stored state, and altered payloads produce `409 Conflict`.
- `test_continuation_lifecycle`: Verifies revision incrementation and terminal completion.
- `test_revision_mismatch_rejection`: Verifies stale revisions are rejected with `409 Conflict`.
- `test_expired_run_returns_410`: Verifies runs older than 30 minutes return `410 Gone`.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](file:///c:/Users/saini/Desktop/ghost-cursor/LICENSE) file for details.

