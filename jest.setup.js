import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';

// Polyfill TextEncoder/TextDecoder required by Next cache/streams
if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
	const { TextEncoder, TextDecoder } = require('util');
	// eslint-disable-next-line no-global-assign
	global.TextEncoder = TextEncoder;
	// eslint-disable-next-line no-global-assign
	global.TextDecoder = TextDecoder;
}

// Polyfill fetch/Request/Response/Headers for Next internals in tests
try {
	const undici = require('undici');
	if (typeof globalThis.fetch === 'undefined') globalThis.fetch = undici.fetch;
	if (typeof globalThis.Request === 'undefined') globalThis.Request = undici.Request;
	if (typeof globalThis.Response === 'undefined') globalThis.Response = undici.Response;
	if (typeof globalThis.Headers === 'undefined') globalThis.Headers = undici.Headers;
} catch {}

// Polyfill matchMedia used by components
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(), // deprecated
		removeListener: jest.fn(), // deprecated
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});

// Polyfill IntersectionObserver for jsdom
class MockIntersectionObserver {
	constructor() {}
	observe() {}
	unobserve() {}
	disconnect() {}
}
Object.defineProperty(window, 'IntersectionObserver', {
	writable: true,
	value: MockIntersectionObserver,
});

// Polyfill ResizeObserver for jsdom
class MockResizeObserver {
  constructor() {}
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock next/image to a plain img for tests
// eslint-disable-next-line @typescript-eslint/no-var-requires
const React = require('react');
jest.mock('next/image', () => ({
	__esModule: true,
	default: (props) => {
		const { src, alt } = props;
		return React.createElement('img', {
			src: typeof src === 'string' ? src : '/test.jpg',
			alt,
		});
	},
}));

// Mock next/link to a simple anchor to avoid useContext requirements
jest.mock('next/link', () => {
	const React = require('react');
	const Link = React.forwardRef(({ href, children, ...rest }, ref) => {
		const resolvedHref = typeof href === 'string' ? href : (href?.pathname || '/');
		return React.createElement('a', { href: resolvedHref, ref, ...rest }, children);
	});
	Link.displayName = 'NextLinkMock';
	return { __esModule: true, default: Link };
});

// Mock GSAP and ScrollTrigger (ESM) to avoid Jest transform issues during tests
jest.mock('gsap', () => ({
  gsap: {
    set: jest.fn(),
    to: jest.fn(),
    registerPlugin: jest.fn(),
  },
}));
jest.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {},
}));

// Mock SmoothScrollProvider to avoid importing Lenis (ESM) in tests
jest.mock('@/components/providers/SmoothScrollProvider', () => {
	const React = require('react');
	const contextValue = {
		lenis: null,
		prefersReducedMotion: false,
		setLenis: () => {},
	};
	const Context = React.createContext(contextValue);
	return {
		__esModule: true,
		SmoothScrollProvider: ({ children }) => React.createElement(Context.Provider, { value: contextValue }, children),
		useSmoothScroll: () => contextValue,
		useLenisInstance: () => null,
	};
});

jest.mock('@/components/ui/CameraWireAnimation', () => {
	const React = require('react');
	return {
		__esModule: true,
		CameraWireAnimation: ({ className = '' }) =>
			React.createElement('div', { 'data-testid': 'camera-wire-animation', className }, null),
	};
});

jest.mock('@/components/ui/FadeInText', () => {
	const React = require('react');
	return {
		__esModule: true,
		FadeInText: ({ children, className = '' }) =>
			React.createElement('div', { 'data-testid': 'fade-in-text', className }, children),
	};
});

// Mock animations hooks to avoid React hook execution in tests
jest.mock('@/lib/animations', () => {
	const React = require('react');
	const makeRef = () => React.createRef();
	return {
		__esModule: true,
		useFadeInAnimation: () => makeRef(),
		useStaggerAnimation: () => makeRef(),
		useHoverAnimation: () => makeRef(),
	};
});
