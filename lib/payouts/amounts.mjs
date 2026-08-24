export const PLATFORM_FEE_RATE = 0.10;

/**
 * Convert a vendor item subtotal to the net transfer amount in cents.
 * Rounding happens once at the Stripe amount boundary to avoid floating-point
 * money errors and ensure Cheaper retains its 10% commission.
 */
export function calculateVendorPayoutCents(subtotal) {
  const subtotalCents = Math.round(Number(subtotal) * 100);
  return Math.round(subtotalCents * (1 - PLATFORM_FEE_RATE));
}

export function isPayoutAccountReady(profile) {
  return Boolean(profile?.stripe_account_id && profile?.stripe_payouts_enabled);
}