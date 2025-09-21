import { fetch, Headers, Request, Response } from 'undici';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for undici in Node environment
if (!(globalThis as any).TextEncoder) {
	(globalThis as any).TextEncoder = TextEncoder;
}
if (!(globalThis as any).TextDecoder) {
	(globalThis as any).TextDecoder = TextDecoder as any;
}

// Polyfill fetch APIs for Node test environment
(globalThis as any).fetch = fetch;
(globalThis as any).Headers = Headers;
(globalThis as any).Request = Request;
(globalThis as any).Response = Response;
