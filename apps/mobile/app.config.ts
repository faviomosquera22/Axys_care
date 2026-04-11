import type { ExpoConfig } from "expo/config";

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? process.env.EAS_PROJECT_ID;

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
  extra: easProjectId
    ? {
        eas: {
          projectId: easProjectId,
        },
      }
    : undefined,
};

export default config;
