const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withUnrestrictMLKitOrientation(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];
    
    // Ensure xmlns:tools is present so we can use tools:replace
    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const activityName = 'com.google.mlkit.vision.codescanner.internal.GmsBarcodeScanningDelegateActivity';
    
    if (!application.activity) {
      application.activity = [];
    }
    
    let hasActivity = false;
    for (const act of application.activity) {
      if (act.$['android:name'] === activityName) {
         act.$['android:screenOrientation'] = 'unspecified';
         // Check if tools:replace exists, if so append, otherwise create
         if (act.$['tools:replace']) {
            if (!act.$['tools:replace'].includes('android:screenOrientation')) {
                act.$['tools:replace'] += ',android:screenOrientation';
            }
         } else {
            act.$['tools:replace'] = 'android:screenOrientation';
         }
         hasActivity = true;
         break;
      }
    }

    if (!hasActivity) {
      // Add the activity to override the one that will be merged from the ML Kit library
      application.activity.push({
        $: {
          'android:name': activityName,
          'android:screenOrientation': 'unspecified',
          'tools:replace': 'android:screenOrientation'
        }
      });
    }

    return config;
  });
};
