export default {
  expo: {
    name: "#local",
    slug: "#local",
    owner: "madhyamakist",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/app-icon.png",
    scheme: "hashtaglocalfrontend",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.madhyamakist.hashtaglocalfrontend",
      associatedDomains: [
        "applinks:hashtaglocal.app",
        "applinks:www.hashtaglocal.app"
      ]
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#ffffff",
        foregroundImage: "./assets/app-icon.png"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.madhyamakist.hashtaglocalfrontend",
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "hashtaglocal.app",
              pathPrefix: "/"
            },
            {
              scheme: "https",
              host: "www.hashtaglocal.app",
              pathPrefix: "/"
            }
          ],
          category: [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-dev-client",
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ]
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "567a7bdf-fc21-4a5f-b83b-8d6d2262b3d2"
      }
    }
  }
};
