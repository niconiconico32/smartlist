const { withInfoPlist } = require('@expo/config-plugins');

function withCleanBackgroundModes(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIBackgroundModes = [];
    return config;
  });
}

module.exports = withCleanBackgroundModes;
