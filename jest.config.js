module.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'managers/entities/**/*.js',
        '!managers/entities/**/*.schema.js',
        '!managers/entities/**/*.validators.js'
    ],
    testMatch: ['**/tests/**/*.test.js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 30000,
    verbose: true
};
