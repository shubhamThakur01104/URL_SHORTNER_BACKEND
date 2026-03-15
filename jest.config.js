export default {
  // 1. Node.js environment select karo
  testEnvironment: 'node',

  setupFilesAfterEnv: ['./tests/setup.js'],

  testTimeout: 60000,
  // 2. Babel ko batao ki files ko transform karna hai
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
  },

  // 3. Batao ki tests kahan dhoondhne hain
  testMatch: ['**/tests/**/*.test.js'],

  // 4. Code coverage report generate karo (Ambala ke pro developers ye zaroor karte hain!)
  collectCoverage: true,
  coverageDirectory: 'coverage',

  // 5. Har test ke baad purane mocks clear karo
  clearMocks: true,

  // Globals
  globals: {
    BASE_URL: process.env.BASE_URL || 'http://localhost:5000',
  },
}
