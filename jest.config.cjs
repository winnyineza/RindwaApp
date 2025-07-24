module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '<rootDir>/server/**/__tests__/**/*.test.ts',
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/client/**/__tests__/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'server/**/*.ts',
    'client/src/**/*.{ts,tsx}',
    'shared/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!server/index.ts',
    '!**/__tests__/**'
  ],
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testTimeout: 30000,
  maxWorkers: 4,
  projects: [
    {
      displayName: 'Server API Tests',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/server/**/__tests__/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json'
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json']
    },
    {
      displayName: 'Integration Tests',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/tests/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json'
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json']
    },
    {
      displayName: 'Frontend Tests',
      preset: 'ts-jest',
      testMatch: ['<rootDir>/client/**/__tests__/**/*.test.tsx'],
      testEnvironment: 'jsdom',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json'
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/client/src/$1'
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json']
    }
  ]
  // globalSetup: '<rootDir>/tests/global-setup.ts',
  // globalTeardown: '<rootDir>/tests/global-teardown.ts'
}; 