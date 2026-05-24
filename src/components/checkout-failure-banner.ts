// Checkout failure banner permanently disabled in this fork (no checkout flow).
// Stub kept so existing call sites that import showCheckoutFailureBanner compile.

export function showCheckoutFailureBanner(_rawStatus: string): void {
  return;
}
