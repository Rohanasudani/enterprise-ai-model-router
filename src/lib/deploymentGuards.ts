import { timingSafeEqual } from "crypto";

export const MAX_PROMPT_CHARS = 6000;
export const MAX_EXPECTED_OUTPUT_CHARS = 4000;
export const MAX_RUBRIC_CRITERIA = 8;
export const MAX_JUDGE_RESULT_IDS = 4;

type GuardFailure = {
  ok: false;
  status: number;
  error: string;
};

type GuardSuccess = {
  ok: true;
};

export type GuardResult = GuardFailure | GuardSuccess;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  route: string;
  limit: number;
  windowMs: number;
};

const rateLimitGlobal = globalThis as typeof globalThis & {
  __aiRouterRateLimits?: Map<string, RateLimitEntry>;
};

function getRateLimitStore() {
  if (!rateLimitGlobal.__aiRouterRateLimits) {
    rateLimitGlobal.__aiRouterRateLimits = new Map<string, RateLimitEntry>();
  }

  return rateLimitGlobal.__aiRouterRateLimits;
}

function normalizeIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") ?? "local";
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function isLiveModeEnabled() {
  return process.env.LIVE_MODE_ENABLED === "true";
}

export function hasValidAdminKey(request: Request) {
  const configuredKey = process.env.DEMO_ADMIN_KEY;
  const suppliedKey = request.headers.get("x-demo-admin-key");

  if (!configuredKey || !suppliedKey) {
    return false;
  }

  return safeCompare(suppliedKey, configuredKey);
}

export function requireAdminKey(request: Request, action: string): GuardResult {
  if (hasValidAdminKey(request)) {
    return { ok: true };
  }

  return {
    ok: false,
    status: process.env.DEMO_ADMIN_KEY ? 401 : 503,
    error: process.env.DEMO_ADMIN_KEY
      ? `${action} requires a valid demo admin key.`
      : "DEMO_ADMIN_KEY is not configured.",
  };
}

export function requireLiveModeAccess(request: Request): GuardResult {
  if (!isLiveModeEnabled()) {
    return {
      ok: false,
      status: 403,
      error: "Live OpenAI mode is disabled for this deployment.",
    };
  }

  return requireAdminKey(request, "Live OpenAI mode");
}

export function requireProductionAdminKey(request: Request, action: string): GuardResult {
  if (!isProduction()) {
    return { ok: true };
  }

  return requireAdminKey(request, action);
}

export function checkRateLimit(request: Request, options: RateLimitOptions): GuardResult {
  const now = Date.now();
  const store = getRateLimitStore();
  const key = `${options.route}:${normalizeIp(request)}`;
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + options.windowMs,
    });
    return { ok: true };
  }

  if (current.count >= options.limit) {
    return {
      ok: false,
      status: 429,
      error: "Too many requests. Please wait before trying again.",
    };
  }

  current.count += 1;
  store.set(key, current);
  return { ok: true };
}

export function validatePromptText(value: string, label: string, maxLength: number): GuardResult {
  if (value.length <= maxLength) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 400,
    error: `${label} must be ${maxLength.toLocaleString()} characters or fewer.`,
  };
}
