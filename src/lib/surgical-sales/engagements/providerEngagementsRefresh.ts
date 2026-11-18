export const PROVIDER_ENGAGEMENTS_REFRESH_EVENT = "provider-engagements-refresh";

export function notifyProviderEngagementsRefresh(providerId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(PROVIDER_ENGAGEMENTS_REFRESH_EVENT, { detail: { providerId } }),
  );
}
