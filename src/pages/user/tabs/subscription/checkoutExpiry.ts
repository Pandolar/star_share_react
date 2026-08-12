const DEFAULT_CHECKOUT_EXPIRY_MS = 5 * 60 * 1000;

interface CheckoutExpiry {
  expires_at?: string | null;
  expires_in_seconds?: number;
}

/**
 * Resolve a checkout lifetime without trusting the user's device clock.
 * The server-relative duration is authoritative; expires_at only supports
 * older responses that do not provide expires_in_seconds.
 */
export const getCheckoutRemainingMs = (
  expiry: CheckoutExpiry,
  nowMs = Date.now(),
): number => {
  const remainingSeconds = Number(expiry.expires_in_seconds);
  if (Number.isFinite(remainingSeconds) && remainingSeconds >= 0) {
    return remainingSeconds * 1000;
  }

  const expiresAtMs = expiry.expires_at ? new Date(expiry.expires_at).getTime() : Number.NaN;
  if (Number.isFinite(expiresAtMs)) return expiresAtMs - nowMs;

  return DEFAULT_CHECKOUT_EXPIRY_MS;
};
