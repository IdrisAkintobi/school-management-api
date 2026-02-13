module.exports = {
    env: {
        node: true,
        es2021: true,
        jest: true
    },
    extends: ['eslint:recommended', 'prettier'],
    plugins: ['prettier'],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        'prettier/prettier': 'error',
        'no-console': 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        'no-process-exit': 'off'
    },
    ignorePatterns: ['node_modules/', 'coverage/', 'logs/', '*.log']
};
