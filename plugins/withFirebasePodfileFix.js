const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Injects ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES into
 * the existing post_install hook in the Podfile.
 *
 * This is required when using use_frameworks! :linkage => :static
 * (via expo-build-properties useFrameworks: "static") alongside
 * @react-native-firebase, because RNFBApp's Objective-C headers
 * import non-modular React-Core headers and Xcode treats that as
 * an error inside a framework module by default.
 *
 * NOTE: A new post_install block is NOT added — CocoaPods forbids
 * multiple post_install hooks, so we insert into the existing one.
 */
function withFirebasePodfileFix(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes("ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES")) {
        // Already patched
        return config;
      }

      const insertCode = [
        "  # Fix: allow @react-native-firebase Objective-C pods to include",
        "  # non-modular React-Core headers when use_frameworks! is active.",
        "  installer.pods_project.targets.each do |target|",
        "    target.build_configurations.each do |build_config|",
        "      build_config.build_settings['ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'",
        "    end",
        "  end",
      ].join("\n");

      if (podfile.includes("post_install do |installer|")) {
        // Inject into the existing post_install block
        podfile = podfile.replace(
          "post_install do |installer|",
          `post_install do |installer|\n${insertCode}`,
        );
      } else {
        // No existing block — add one
        podfile += [
          "",
          "post_install do |installer|",
          insertCode,
          "end",
          "",
        ].join("\n");
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
}

module.exports = withFirebasePodfileFix;
