// Run BEFORE the Jest test framework and test files are evaluated.
// Ensure Web Fetch API and encoders exist so Next.js route modules can import safely.

const { TextEncoder, TextDecoder } = require('util');
const { ReadableStream, TransformStream } = require('stream/web');
const { Blob, File } = require('buffer');
const { MessageChannel, MessagePort } = require('worker_threads');
const { setImmediate, clearImmediate } = require('timers');

Object.defineProperties(globalThis, {
  TextEncoder: { value: globalThis.TextEncoder ?? TextEncoder, writable: true },
  TextDecoder: { value: globalThis.TextDecoder ?? TextDecoder, writable: true },
  ReadableStream: { value: globalThis.ReadableStream ?? ReadableStream, writable: true },
  TransformStream: { value: globalThis.TransformStream ?? TransformStream, writable: true },
  Blob: { value: globalThis.Blob ?? Blob, writable: true },
  File: { value: globalThis.File ?? File, writable: true },
  MessageChannel: { value: globalThis.MessageChannel ?? MessageChannel, writable: true },
  MessagePort: { value: globalThis.MessagePort ?? MessagePort, writable: true },
  // Let React's scheduler use Node timers instead of keeping a MessagePort alive
  // in jsdom. This affects the test environment only.
  setImmediate: { value: globalThis.setImmediate ?? setImmediate, writable: true },
  clearImmediate: { value: globalThis.clearImmediate ?? clearImmediate, writable: true },
});

const undici = require('undici');

// Polyfill browser/Fetch globals before Next route modules are imported.
Object.defineProperties(globalThis, {
  fetch: { value: undici.fetch, writable: true },
  Headers: { value: undici.Headers, writable: true },
  Request: { value: undici.Request, writable: true },
  Response: { value: undici.Response, writable: true },
  FormData: { value: undici.FormData, writable: true },
});
