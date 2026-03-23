/**
 * Expo Config Plugin: withRemoveBootReceiver
 *
 * Removes BOOT_COMPLETED-related receivers injected by expo-audio
 * (AudioControlsService, AudioRecordingService) from AndroidManifest.xml.
 * Also removes the RECEIVE_BOOT_COMPLETED permission to comply with
 * Android 15's restricted foreground service types policy.
 */
const { withAndroidManifest } = require("@expo/config-plugins");

function withRemoveBootReceiver(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    // 1. Remove RECEIVE_BOOT_COMPLETED permission
    if (manifest["uses-permission"]) {
      manifest["uses-permission"] = manifest["uses-permission"].filter(
        (perm) => {
          const name = perm.$?.["android:name"];
          return (
            name !== "android.permission.RECEIVE_BOOT_COMPLETED" &&
            name !== "RECEIVE_BOOT_COMPLETED"
          );
        }
      );
    }

    // 2. Remove BOOT_COMPLETED receivers from the application node
    const application = manifest.application?.[0];
    if (application?.receiver) {
      application.receiver = application.receiver.filter((receiver) => {
        const intentFilters = receiver["intent-filter"] || [];
        const hasBootAction = intentFilters.some((filter) => {
          const actions = filter.action || [];
          return actions.some(
            (action) =>
              action.$?.["android:name"] ===
              "android.intent.action.BOOT_COMPLETED"
          );
        });

        if (hasBootAction) {
          const receiverName = receiver.$?.["android:name"] || "unknown";
          console.log(
            `[withRemoveBootReceiver] Removed BOOT_COMPLETED receiver: ${receiverName}`
          );
          return false; // Remove it
        }
        return true; // Keep it
      });

      // Clean up empty array
      if (application.receiver.length === 0) {
        delete application.receiver;
      }
    }

    return config;
  });
}

module.exports = withRemoveBootReceiver;
