# 🛠️ Ghost Cursor — Operations & Observability Runbook

## 1. Health Checks & Monitoring

- **Endpoint:** `GET /health` (Unauthenticated, returns `200 OK`)
- **Metrics Tracked:**
  - `ghost_cursor_run_duration_seconds`: P50, P95, P99 request latency
  - `ghost_cursor_tool_execution_total`: Counter by tool name and status
  - `ghost_cursor_run_errors_total`: Counter by error category (auth, expired, timeout, cascade_failure)

---

## 2. Ephemeral Run State Management

- Runs are scoped by `(tenant_id, subject, request_id)`
- Runs expire automatically after **30 minutes**.
- Any continuation turn beyond 30 minutes returns HTTP `410 Gone`.
- Continuation turns are limited to a maximum of **12 turns** per run.
- Optimistic locking checks revision numbers (`409 Conflict` on mismatch).

---

## 3. Canary Leak Detection Incidents

If a customer gateway detects the string:
```text
GHOST_BRAIN_SERVER_ONLY_CANARY_2026
```
in a response destined for the browser, it immediately aborts transmission, logs a critical alert, and returns a safe sanitized error to the client.

### Investigation Steps:
1. Identify the offending run ID in Cloud Logging.
2. Inspect the prompt template and dynamic Brain resolution in `BrainLoader`.
3. Verify that the agent prompt instructions emphasize summarizing rather than quoting Brain text directly.

