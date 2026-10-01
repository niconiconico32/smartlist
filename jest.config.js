module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["@testing-library/jest-native/extend-expect", "<rootDir>/jest.setup.js"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|expo-notifications|expo-device|expo-constants|expo-linking|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-purchases)"
  ],
  // Edge Function suites are NOT Jest tests. supabase/functions/divide-task/test.js
  // is a standalone Node script (its own assertEquals + pass/fail counters) that
  // Jest used to collect via the default **/test.js match and then crash on its
  // ESM `export`. Run those separately, e.g. `node supabase/functions/divide-task/test.js`.
  // Scope this to <function>/test.* only — the real suites live in
  // supabase/functions/**/__tests__/ and MUST keep running.
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/supabase/functions/[^/]+/test\\.(js|ts|mjs)$",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/types/**/*.{ts,tsx}"
  ]
};
