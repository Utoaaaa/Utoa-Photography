import '@testing-library/jest-dom';
import 'jest-axe/extend-expect';

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
jest.mock('@/components/providers/SmoothScrollProvider', () => ({
  __esModule: true,
  SmoothScrollProvider: ({ children }) => children,
}));