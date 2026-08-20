import assert from "node:assert/strict";
import test from "node:test";
import {
  checkRateLimit,
  hasValidAdminKey,
  isLiveModeEnabled,
  parseJsonBody,
  requireJsonRequest,
  requireLiveModeAccess,
  requireProductionAdminKey,
  safeErrorMessage,
  validatePromptText,
} from "./deploymentGuards";

const originalEnv = {
  DEMO_ADMIN_KEY: process.env.DEMO_ADMIN_KEY,
  LIVE_MODE_ENABLED: process.env.LIVE_MODE_ENABLED,
  NODE_ENV: process.env.NODE_ENV,
};

function restoreEnv() {
  process.env.DEMO_ADMIN_KEY = originalEnv.DEMO_ADMIN_KEY;
  process.env.LIVE_MODE_ENABLED = originalEnv.LIVE_MODE_ENABLED;
  process.env.NODE_ENV = originalEnv.NODE_ENV;
}

test.afterEach(() => {
  restoreEnv();
});

test("live mode is opt-in by environment variable", () => {
  process.env.LIVE_MODE_ENABLED = "false";
  assert.equal(isLiveModeEnabled(), false);

  process.env.LIVE_MODE_ENABLED = "true";
  assert.equal(isLiveModeEnabled(), true);
});

test("admin key validation requires the configured header value", () => {
  process.env.DEMO_ADMIN_KEY = "demo-secret";

  const allowed = new Request("https://example.com", {
    headers: {
      "x-demo-admin-key": "demo-secret",
    },
  });
  const denied = new Request("https://example.com", {
    headers: {
      "x-demo-admin-key": "wrong",
    },
  });

  assert.equal(hasValidAdminKey(allowed), true);
  assert.equal(hasValidAdminKey(denied), false);
});

test("live mode requires both opt-in and a valid admin key", () => {
  process.env.LIVE_MODE_ENABLED = "true";
  process.env.DEMO_ADMIN_KEY = "demo-secret";

  const request = new Request("https://example.com", {
    headers: {
      "x-demo-admin-key": "demo-secret",
    },
  });

  assert.deepEqual(requireLiveModeAccess(request), { ok: true });
});

test("production-only admin guard allows local development", () => {
  process.env.NODE_ENV = "development";
  const request = new Request("https://example.com");

  assert.deepEqual(requireProductionAdminKey(request, "Prompt writes"), { ok: true });
});

test("rate limit blocks requests after the configured allowance", () => {
  const request = new Request("https://example.com", {
    headers: {
      "x-forwarded-for": "203.0.113.20",
    },
  });
  const route = `test-route-${Date.now()}`;

  assert.deepEqual(checkRateLimit(request, { route, limit: 2, windowMs: 60_000 }), { ok: true });
  assert.deepEqual(checkRateLimit(request, { route, limit: 2, windowMs: 60_000 }), { ok: true });

  const blocked = checkRateLimit(request, { route, limit: 2, windowMs: 60_000 });
  assert.equal(blocked.ok, false);
  if (!blocked.ok) {
    assert.equal(blocked.status, 429);
  }
});

test("prompt text validation caps large inputs", () => {
  assert.deepEqual(validatePromptText("short", "Prompt", 10), { ok: true });

  const result = validatePromptText("too long", "Prompt", 3);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 400);
  }
});

test("JSON request guard rejects non-JSON posts", () => {
  const request = new Request("https://example.com", {
    method: "POST",
    headers: {
      "content-type": "text/plain",
    },
  });

  const result = requireJsonRequest(request);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.status, 415);
  }
});

test("JSON parser returns a typed body or a safe 400", async () => {
  const valid = await parseJsonBody<{ name: string }>(
    new Request("https://example.com", {
      method: "POST",
      body: JSON.stringify({ name: "router" }),
    }),
  );
  assert.deepEqual(valid, { ok: true, data: { name: "router" } });

  const invalid = await parseJsonBody(
    new Request("https://example.com", {
      method: "POST",
      body: "{not-json",
    }),
  );
  assert.equal(invalid.ok, false);
  if (!invalid.ok) {
    assert.equal(invalid.status, 400);
  }
});

test("production error messages avoid leaking raw provider details", () => {
  process.env.NODE_ENV = "production";

  assert.equal(safeErrorMessage(new Error("upstream stack details"), "Provider failed."), "Provider failed.");
  assert.equal(safeErrorMessage(new Error("insufficient quota"), "Provider failed."), "Provider quota is unavailable.");
});
