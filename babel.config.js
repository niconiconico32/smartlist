module.exports = function (api) {
  api.cache(true);

  const isProduction = process.env.NODE_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Strip all console.* calls in production builds
      ...(isProduction ? ['transform-remove-console'] : []),
      'react-native-reanimated/plugin',
    ],
  };
};
