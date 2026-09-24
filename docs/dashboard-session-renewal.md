# Dashboard automatic session renewal

The browser checks login and named staff credentials on startup and once per
minute, renewing only when they have five minutes or less remaining. Returning
to a visible tab, page restoration and coming online also trigger a check.
Concurrent refresh callers share one request per credential type. Temporary
network, timeout and server failures preserve credentials and back off for 30
seconds; definitive 401/403 rejection requires sign-in. Responses arriving after
logout or an identity change cannot restore the previous credential.

Fetch and Axios callers use renewed tokens, including components retaining an old
staff token for the same session or an old vendor-login token for the same cafe.
Staff requests cannot fall back to the owner's login on a 401. Login renewal also
reconnects the dashboard socket with the new handshake credential. Staff renewal
updates the active profile's permissions from the server.

## Backend endpoint

`POST /api/vendor/{vendor_id}/access/session/refresh` on the dashboard service.
Authorization: Bearer the current, unexpired named staff/owner access token.
No body required. Success 200 returns the same `{token,vendor_id,staff}` contract
as unlock, with current role permissions and a new JWT expiry.

The server locks and extends the existing CafeStaffSession row and retains its
JTI. This prevents concurrent tabs from creating separate renewal sessions and
ensures logout closes all tokens belonging to that session. Each renewal records
`session.renewed` in the audit log. Closed, expired, disabled, wrong-cafe or
unauthorized staff sessions cannot renew. No SQL migration is needed beyond the
existing cafe-wallet staff-session tables. Deploy the dashboard service endpoint
before the frontend; otherwise staff renewal cannot succeed.

Renewal does not bypass expiry. If the browser/PC sleeps or stays offline beyond
the token deadline, the backend requires sign-in again. No page reload is needed
for successful renewal. This implementation has been tested locally, not deployed.

Validation: `node --test tests/auth-session.test.cjs`; backend
`python -m pytest tests/test_cafe_wallet.py -q` (PostgreSQL-specific cases require
CAFE_TEST_DATABASE_URL pointing to a disposable database).
