import * as Sentry from '@sentry/react-native';

/**
 * Crash reporting for GetSecureVault.
 *
 * This is a password manager. The app already calls `expo-screen-capture` to
 * stop the OS from screenshotting it, so a crash reporter that shipped
 * screenshots or view hierarchies would quietly undo a security control the
 * product deliberately implements. Everything below is set to keep that
 * promise:
 *
 *  - no screenshots, no view hierarchy
 *  - no PII, no default user context
 *  - breadcrumbs OFF entirely. This is the important one: automatic
 *    breadcrumbs record navigation, touches and network calls, and in this app
 *    a route name alone ("add-item", an entry title in a nav param) leaks what
 *    the user stores. Losing breadcrumb context makes debugging harder; it is
 *    the correct trade for a vault.
 *  - a beforeSend that strips anything resembling a secret out of exception
 *    messages, as a backstop for the above.
 *
 * The DSN is a write-only ingestion credential — public by design and safe in
 * an app binary. It cannot read data out of Sentry.
 */

const DSN = 'https://dad8a689739ea283ea2b12e84b370111@o4510838888595456.ingest.us.sentry.io/4511852405981184';

/** Anything that looks like a stored secret, a token, or a vault entry id. */
const SENSITIVE = new RegExp(
  [
    String.raw`(?:password|passphrase|secret|token|seed|otp|totp|apikey|api_key)\s*[=:]\s*\S+`,
    String.raw`\b[A-Za-z0-9+/]{40,}={0,2}\b`, // long base64-ish blobs
    String.raw`\botpauth://\S+`, // 2FA provisioning URIs from the QR scanner
  ].join('|'),
  'gi',
);

function redact(s: string | undefined): string | undefined {
  return s?.replace(SENSITIVE, '<redacted>');
}

/**
 * Call once, at module scope in `app/_layout.tsx` — before the router mounts,
 * so a failure during the very first render is captured.
 */
export function initSentry(): void {
  if (!DSN) return;

  Sentry.init({
    dsn: DSN,
    environment: __DEV__ ? 'development' : 'production',
    // Crashes are the need here, not latency spans.
    tracesSampleRate: 0,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    // See the note above: a breadcrumb in this app can name what the user
    // stores. `maxBreadcrumbs: 0` is the supported way to switch them off —
    // there is no `enableAutoBreadcrumbTracking` option in this SDK (checked
    // against the installed ReactNativeOptions type, not assumed). beforeSend
    // clears the array too, as a backstop.
    maxBreadcrumbs: 0,
    // Without SDK logging in dev, a dead pipeline and a healthy one look
    // identical from the outside.
    debug: __DEV__,
    beforeSend(event) {
      event.exception?.values?.forEach((e) => {
        e.value = redact(e.value);
      });
      if (event.message) event.message = redact(event.message);
      // Belt and braces: drop breadcrumbs even if a future SDK default
      // re-enables them.
      event.breadcrumbs = [];
      return event;
    },
  });
}
