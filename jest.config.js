module.exports = {
    preset: "jest-expo",
  
    testEnvironment: "jsdom",
  
    setupFilesAfterEnv: [
      "@testing-library/jest-native/extend-expect",
    ],
  
    transformIgnorePatterns: [
      "node_modules/(?!(jest-)?react-native" +
        "|@react-native" +
        "|expo(nent)?" +
        "|@expo(nent)?" +
        "|expo-modules-core" +
        "|expo-image" +
        "|expo-router" +
        ")"
    ],
  
    moduleNameMapper: {
      "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js",
    },
  };
  