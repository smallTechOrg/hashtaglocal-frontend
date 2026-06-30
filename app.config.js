const { withDangerousMod, withProjectBuildGradle } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const CAMERA_PERMISSION =
  "#local uses the camera so you can take photos of local civic issues when creating a report. For example, you can photograph a pothole, broken streetlight, or garbage pile and attach it to your report.";

const LOCATION_WHEN_IN_USE_PERMISSION =
  "#local uses your location while the app is open to tag issue reports to the correct place, find nearby reports before you submit, and show local issues and events on the map. For example, your current location helps attach a pothole report to the right street.";

function withModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile",
      );
      let contents = fs.readFileSync(podfilePath, "utf8");
      if (!contents.includes("use_modular_headers!")) {
        contents = contents.replace(
          /(platform :ios[^\n]*\n)/,
          "$1use_modular_headers!\n",
        );
        fs.writeFileSync(podfilePath, contents);
      }
      return config;
    },
  ]);
}

// Notifee ships its native `app.notifee:core` artifact as a bundled aar inside
// its node_module instead of a public Maven repo. Notifee self-registers that
// repo from its own subproject build file, but under Expo's --configure-on-demand
// build that runs too late for :app to resolve it. Inject the repo into the root
// build.gradle's allprojects block so it's always present.
function withNotifeeRepo(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language !== "groovy") {
      return config;
    }
    if (
      config.modResults.contents.includes(
        "@notifee/react-native/android/libs",
      )
    ) {
      return config;
    }
    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*\{\s*repositories\s*\{/,
      (match) =>
        `${match}\n      maven { url "$rootDir/../node_modules/@notifee/react-native/android/libs" }`,
    );
    return config;
  });
}

export default {
  expo: {
    name: "#local",
    slug: "hashtaglocal",
    owner: "smalltech",
    version: "1.0.7",
    orientation: "portrait",
    icon: "./assets/app-icon.png",
    scheme: "hashtaglocal",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    updates: {
      url: "https://u.expo.dev/18f89762-0ed6-4b80-9076-c91679fc6eb4",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    ios: {
      supportsTablet: true,
      googleServicesFile:
        process.env.GOOGLE_SERVICE_INFO_PLIST ?? "./GoogleService-Info.plist",
      bundleIdentifier: "com.smalltech.hashtaglocal",
      buildNumber: "2",
      usesAppleSignIn: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: CAMERA_PERMISSION,
        NSLocationWhenInUseUsageDescription: LOCATION_WHEN_IN_USE_PERMISSION,
      },
      associatedDomains: [
        "applinks:hashtaglocal.app",
        "applinks:www.hashtaglocal.app",
      ],
      entitlements: {
        "aps-environment": process.env.EAS_BUILD_PROFILE === "production" ? "production" : "development",
      },
    },
    notification: {
      icon: "./assets/notification-icon.png",
      color: "#256D1B",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff",
        foregroundImage: "./assets/app-icon.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      package: "com.smalltech.hashtaglocal",
      permissions: [
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
      ],
      versionCode: 5,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "hashtaglocal.app",
              pathPrefix: "/",
            },
            {
              scheme: "https",
              host: "www.hashtaglocal.app",
              pathPrefix: "/",
            },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-updates",
      "expo-dev-client",
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics",
      "@react-native-firebase/perf",
      "@react-native-firebase/messaging",
      withModularHeaders,
      withNotifeeRepo,
      "expo-router",
      [
        "expo-camera",
        {
          cameraPermission: CAMERA_PERMISSION,
        },
      ],
      [
        "expo-location",
        {
          locationWhenInUsePermission: LOCATION_WHEN_IN_USE_PERMISSION,
        },
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/logo-green.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
      eas: {
        projectId: "18f89762-0ed6-4b80-9076-c91679fc6eb4",
      },
    },
  },
};
