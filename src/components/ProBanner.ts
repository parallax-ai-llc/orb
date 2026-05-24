// Pro launch banner permanently disabled in this fork.
// Exports preserved as no-ops so existing call sites compile.

export function showProBanner(_container: HTMLElement): void {
  return;
}

export function hideProBanner(): void {
  return;
}

export function isProBannerVisible(): boolean {
  return false;
}
