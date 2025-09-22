import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const config: Config = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.contract.ts'],
  testMatch: ['<rootDir>/tests/contract/**/*.{ts,tsx,js,jsx}'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '<rootDir>/tests/contract/test_publishing_.*\\.ts$',
    '<rootDir>/tests/contract/test_revalidate\\.ts$',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  coverageProvider: 'v8',
  verbose: false,
};

export default createJestConfig(config);
