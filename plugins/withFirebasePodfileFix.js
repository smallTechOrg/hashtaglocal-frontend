const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

/**
 * Adds a post_install hook to the Podfile that sets
 * ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES.
 *
 * This is required when using use_frameworks! :linkage => :static
 * (via expo-build-properties useFrameworks: "static") alongside
 * @react-native-firebase, because RNFBApp's Objective-C headers
 * import non-modular React-Core headers and Xcode treats that as
 * an error inside a framework module by default.
 */
function withFirebasePodfileFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      if (!podfile.includes('ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        const hook = [
          '',
          '# Fix: allow @react-native-firebase Objective-C pods to include',
          '# non-modular React-Core headers when use_frameworks! is active.',
          'post_install do |installer|',
          '  installer.pods_project.targets.each do |target|',
          '    target.build_configurations.each do |build_config|',
          "      build_config.build_settings['ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'",
          '    end',
          '  end',
          'end',
        ].join('\n');

        fs.writeFileSync(podfilePath, podfile + hook);
      }

      return config;
    },
  ]);
}

module.exports = withFirebasePodfileFix;
