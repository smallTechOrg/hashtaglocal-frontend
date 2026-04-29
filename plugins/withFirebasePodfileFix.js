const { withDangerousMod } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

/**
 * Injects CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES
 * and suppresses -Wnon-modular-include-in-framework-module via OTHER_CFLAGS
 * into the existing post_install hook in the Podfile.
 *
 * Required when using use_frameworks! :linkage => :static (via
 * expo-build-properties useFrameworks: "static") alongside
 * @react-native-firebase, because RNFBApp's Objective-C headers import
 * non-modular React-Core headers and Xcode treats that as an error inside
 * a framework module by default.
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

      if (podfile.includes("CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES")) {
        return config;
      }

      const insertCode = [
        "  # Fix: allow @react-native-firebase pods to include non-modular React-Core",
        "  # headers when use_frameworks! :linkage => :static is active.",
        "  installer.pods_project.targets.each do |target|",
        "    target.build_configurations.each do |build_config|",
        "      build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'",
        "      flags = build_config.build_settings['OTHER_CFLAGS'] || '$(inherited)'",
        "      unless flags.include?('-Wno-non-modular-include-in-framework-module')",
        "        build_config.build_settings['OTHER_CFLAGS'] = flags + ' -Wno-non-modular-include-in-framework-module'",
        "      end",
        "    end",
        "  end",
      ].join("\n");

      if (podfile.includes("post_install do |installer|")) {
        podfile = podfile.replace(
          "post_install do |installer|",
          `post_install do |installer|\n${insertCode}`,
        );
      } else {
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
