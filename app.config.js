module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
    posthogHost: process.env.POSTHOG_HOST,
  },
  plugins: [
    ...(config.plugins || []),
    "expo-localization",
    "@react-native-community/datetimepicker",
  ],
});
