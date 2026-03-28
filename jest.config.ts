import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterFramework: ['<rootDir>/tests/setup.ts'],
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts', '<rootDir>/tests/unit/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/layout.tsx',
  ],
}

export default createJestConfig(config)
