# ☁️ Ghost Cursor — Google Cloud Platform Production Architecture

## 1. Managed Infrastructure Topology

Ghost Cursor Cloud runs on GCP managed serverless services:

```
[ User Browser ]
      │ (HTTPS/WSS)
      ▼
[ Cloud Load Balancing + Cloud Armor ]
      │
      ▼
[ Cloud Run: ghost-cursor-api (FastAPI + Google ADK) ]
      ├── Cloud SQL for PostgreSQL 17 (Private IP via Direct VPC Egress)
      ├── Secret Manager (Tenant Keys, IAM Credentials)
      ├── Vertex AI Gemini 2.0 (Agentic Tool Calling)
      └── Cloud Logging & Cloud Monitoring
```

---

## 2. Key Architectural Decisions (ADRs)

- **ADR-001 (Framework):** Python 3.12 + FastAPI for native Google ADK & Vertex AI SDK integration.
- **ADR-002 (Compute):** Cloud Run over GKE. Zero cluster maintenance, scale-to-zero when idle, native WebSockets & HTTP/2.
- **ADR-003 (LLM):** Vertex AI Gemini 2.0 Flash for sub-second tool planning latency.
- **ADR-005 (Topology):** Customer Gateway Proxy. Browser never accesses LLM directly.
- **ADR-007 (Widget Isolation):** Shadow DOM sandboxing for 100% CSS encapsulation.
- **ADR-008 (Decomposition):** Single Cloud Run Monolithic agent container. Zero inter-service network overhead.
- **ADR-009 (DOM Resolution):** Deterministic 5-level Element Targeting Cascade.
- **ADR-011 (Backend Tools):** Gateway Reverse-Dispatch under user session (`X-Ghost-Subject`).
- **ADR-012 (Data Sovereignty):** Customer database stores chat history; Ghost Cloud stores only ephemeral run state (30m TTL).

---

## 3. Deployment Commands

```bash
# 1. Deploy Orchestrator Cloud Run Container
gcloud run deploy ghost-cursor-api \
    --source ./services/orchestrator \
    --region us-central1 \
    --set-env-vars "GCP_PROJECT=ghost-cursor" \
    --min-instances 0 \
    --max-instances 5 \
    --memory 1Gi \
    --cpu 1

# 2. Deploy ShopHive Demo Application
gcloud run deploy shophive-demo \
    --source ./demo/shophive/backend \
    --region us-central1 \
    --min-instances 0 \
    --max-instances 1

# 3. Publish Frontend SDK to Cloud Storage CDN
gsutil cp packages/sdk-frontend/dist/ghost-cursor.min.js \
    gs://ghost-cursor-sdk/v1/
```

