// Run BEFORE the Jest test framework and test files are evaluated.
// Ensure Web Fetch API and encoders exist so Next.js route modules can import safely.

// Polyfill TextEncoder/TextDecoder required by Next cache/streams
if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  // eslint-disable-next-line no-global-assign
  global.TextEncoder = TextEncoder;
  // eslint-disable-next-line no-global-assign
  global.TextDecoder = TextDecoder;
}

// Polyfill fetch/Request/Response/Headers using undici for Node
try {
  const undici = require('undici');
  if (typeof globalThis.fetch === 'undefined') globalThis.fetch = undici.fetch;
  if (typeof globalThis.Request === 'undefined') globalThis.Request = undici.Request;
  if (typeof globalThis.Response === 'undefined') globalThis.Response = undici.Response;
  if (typeof globalThis.Headers === 'undefined') globalThis.Headers = undici.Headers;
} catch {
  // undici not available; tests that require fetch may fail, but avoid crashing here.
}
