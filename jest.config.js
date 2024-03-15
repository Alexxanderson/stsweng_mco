module.exports = {
    //testEnvironment: 'jsdom', //Comment this out if need to test backend.
    testEnvironment: 'jest-environment-jsdom',
    moduleDirectories: ['node_modules', '<rootDir>/'],
    moduleNameMapper: {
      // Handle module aliases (if you have them in your Next.js project)
      '^@components/(.*)$': '<rootDir>/components/$1',
      // Mock static asset imports (images, stylesheets) which Jest can't process
      '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      '^@lib/(.*)$': '<rootDir>/src/lib/$1', // Example for aliasing 'src/lib' to '@lib'
      '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
      "^@/api/(.*)$": "<rootDir>/src/app/api/$1",
      '^app/(.*)$': '<rootDir>/src/app/$1',
      "^@/(.*)$": "<rootDir>/src/$1",
      "^@route/(.*)$": "<rootDir>/src/app/$1",
    },
    transform: {
      // Use babel-jest to transpile tests in JS/JSX
      '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['next/babel'] }],
    },
    setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.js', '<rootDir>/src/tests/jest.setup.js'], // Adjust paths as necessary
    // Collect coverage from all files except those in the node_modules directory
    collectCoverageFrom: ['src/**/*.{js,jsx}', '!**/node_modules/**'],
    // Ignore the following directories when collecting coverage
    coveragePathIgnorePatterns: ['src/pages', 'src/styles', 'src/tests', 'src/lib'],
    // Configure the coverage report
    coverageReporters: ['text', 'lcov', 'clover'],


  };