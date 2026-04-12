# API Production Readiness

## Service Ownership
- `VENDOR_ONBOARD_URL` -> `hfg-onboard`
- `DASHBOARD_URL` -> `hfg-dashboard-service` (includes websocket bridge/server)
- `BOOKING_URL` -> `hfg-booking` (includes websocket server)
- `LOGIN_URL` -> `hfg-login-service`

## What Was Hardened
- Added production secret validation guards (startup fails in `APP_ENV=production` when default/weak secrets are used).
- Added proxy-aware deployment support (`TRUST_PROXY=true`) for correct client IP/proto behind load balancers.
- Added request tracing headers (`X-Request-Id`) and latency headers (`X-Response-Time-Ms`) for all services.
- Added configurable slow-request logging thresholds (`API_SLOW_REQUEST_MS`).
- Switched `hfg-onboard` from Flask dev-server startup to Gunicorn WSGI startup.
- Added tunable Gunicorn runtime parameters in Dockerfiles (workers, timeout, keepalive, max-requests).
- Added Socket.IO ping/buffer tuning knobs for websocket services (`hfg-dashboard-service`, `hfg-booking`).

## 50 ms Target
- Use this as `p95` for hot read endpoints, not a blanket rule for every endpoint and every write path.
- Writes and endpoints that depend on external systems (payment/email/storage) should use separate SLOs (for example `p95 < 200-500 ms`).

## Recommended SLO Split
- Read-heavy cached endpoints: `p95 <= 50 ms`
- Auth/session endpoints: `p95 <= 100 ms`
- Write endpoints with DB transaction: `p95 <= 200 ms`
- Payment/external integration endpoints: `p95 <= 500 ms`

## Required Production Env Vars
- `APP_ENV=production`
- `SECRET_KEY` (>= 32 chars, non-default)
- `JWT_SECRET_KEY` (>= 32 chars, non-default)
- `DATABASE_URI`
- `REDIS_URL` (for booking + dashboard bridge + onboarding OTP paths)
- `CORS_ALLOWED_ORIGINS` (explicit production domains, no wildcard)

## Perf Tuning Env Vars (Optional)
- `API_SLOW_REQUEST_MS` (default `120`)
- `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_TIMEOUT_SEC`, `DB_POOL_RECYCLE_SEC`
- `DB_CONNECT_TIMEOUT_SEC`, `DB_STATEMENT_TIMEOUT_MS` (onboarding)
- `SOCKETIO_PING_INTERVAL_SEC`, `SOCKETIO_PING_TIMEOUT_SEC`
- `GUNICORN_WORKERS`, `GUNICORN_TIMEOUT`, `GUNICORN_KEEPALIVE`, `GUNICORN_MAX_REQUESTS`
