/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testPathIgnorePatterns: ['/node_modules/', '/build/'],
    testMatch: ['**/tests/**/*.spec.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: './tsconfig.json',
        }],
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/../../$1',
    },
    rootDir: '.',
    verbose: true,
    testTimeout: 30000, // 30 seconds for blockchain tests
};
