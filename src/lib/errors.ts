import { extractUpgradeOffer, renderUpgradeOffer, type UpgradeOffer } from "./upgrade.js";
import { authGuidance } from "./auth-guidance.js";

export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unknown error occurred";
}

/**
 * Error carrying a structured upgrade offer, so a caller that wants the raw
 * data (rather than the rendered card) can still reach it.
 */
export class PlanLimitError extends Error {
  readonly offer: UpgradeOffer;

  constructor(offer: UpgradeOffer, rendered: string) {
    super(rendered);
    this.name = "PlanLimitError";
    this.offer = offer;
  }
}

/** A non-2xx MisarSEO response, keeping the status and machine code. */
export class MisarSeoApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "MisarSeoApiError";
  }
}

/**
 * Turn a non-2xx API response into an Error carrying the server's own message.
 *
 * MisarSEO's REST routes answer failures with `jsonError` —
 * `{ error: "<message>", code?: "<APP_ERROR_CODE>" }` (src/server/lib/api-auth.ts)
 * — so `error` is the human message and `code` the machine one
 * (RATE_LIMITED, PLAN_LIMIT_REACHED, SEO_DATA_UNAVAILABLE, …). The code is kept
 * in the message because it is often the single most useful fact for the
 * agent: SEO_DATA_UNAVAILABLE means "nothing was measured", never "zero".
 *
 * A 401 becomes the full "rejected key" guidance — MisarSEO flattens a revoked
 * key, a workspace removal and a downgraded plan's lost API access all to 401,
 * and "Unauthorized" alone would leave the user with nothing to act on.
 *
 * When the body is a plan-limit rejection carrying an upsell offer, the message
 * becomes the full rendered upgrade card — so EVERY tool surfaces it
 * automatically, without each one needing to handle quota errors itself.
 */
export function apiError(status: number, body: unknown): Error {
  const offer = extractUpgradeOffer(body);
  if (offer) return new PlanLimitError(offer, renderUpgradeOffer(offer));

  let message: string | null = null;
  let code: string | undefined;
  if (typeof body === "object" && body !== null) {
    const b = body as Record<string, unknown>;
    if (typeof b.error === "string") message = b.error;
    else if (typeof b.message === "string") message = b.message;
    if (typeof b.code === "string") code = b.code;
  } else if (typeof body === "string" && body.trim() && body.length < 500) {
    message = body.trim();
  }

  if (status === 401) {
    return new MisarSeoApiError(authGuidance("rejected"), status, code ?? "UNAUTHENTICATED");
  }

  const text = message ?? `HTTP ${status}`;
  return new MisarSeoApiError(code && !text.includes(code) ? `${text} (${code})` : text, status, code);
}
