import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Axyscare",
  slug: "axyscare",
  scheme: "axyscare",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  plugins: ["expo-router", "react-native-document-scanner-plugin"],
  experiments: {
    typedRoutes: true,
  },
  ios: {
    bundleIdentifier: "com.axyscare.mobile",
    infoPlist: {
      NSCameraUsageDescription: "Axyscare necesita acceso a cámara para escanear documentos clínicos.",
    },
  },
  android: {
    package: "com.axyscare.mobile",
  },
  extra: {
    eas: {
      projectId: "axyscare-local",
    },
  },
};

export default config;

