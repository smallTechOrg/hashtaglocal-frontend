export default {
  expo: {
    name: "#local",
    slug: "hashtaglocal",
    owner: "smalltech",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/app-icon.png",
    scheme: "hashtaglocal",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      googleServicesFile: "./GoogleService-Info.plist",
      bundleIdentifier: "com.smalltech.hashtaglocal",
      associatedDomains: [
        "applinks:hashtaglocal.app",
        "applinks:www.hashtaglocal.app",
      ],
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff",
        foregroundImage: "./assets/app-icon.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      googleServicesFile: "./google-services.json",
      package: "com.smalltech.hashtaglocal",
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
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
        },
      ],
      "expo-dev-client",
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics",
      "@react-native-firebase/perf",
      "expo-router",
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
