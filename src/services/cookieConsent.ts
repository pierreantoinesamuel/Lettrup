const STORAGE_KEY = 'cvpilot_cookie_consent';
const CONSENT_EVENT = 'cvpilot:cookie-consent-changed';

export interface CookieConsentState {
  necessary: true;
  analytics: boolean;
  decidedAt: string;
}

export function getCookieConsent(): CookieConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CookieConsentState) : null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent()?.analytics === true;
}

export function saveCookieConsent(analytics: boolean): void {
  const state: CookieConsentState = {
    necessary: true,
    analytics,
    decidedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
}

export function onCookieConsentChange(callback: (state: CookieConsentState) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent<CookieConsentState>).detail);
  window.addEventListener(CONSENT_EVENT, handler);
  return () => window.removeEventListener(CONSENT_EVENT, handler);
}
