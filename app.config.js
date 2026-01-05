// app.config.js
// Expo ya carga automáticamente las variables de .env
// No necesitamos require('dotenv') porque no funciona en React Native
module.exports = {
  expo: {
    name: 'TodoApp',
    slug: 'todo-app',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#8B0000'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.todoapp.todo',
      googleServicesFile: './GoogleService-Info.plist'
    },
    android: {
      package: 'com.todoapp.todo',
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#8B0000'
      },
      permissions: [
        'NOTIFICATIONS',
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE'
      ]
    },
    plugins: [
      'expo-notifications'
    ],
    updates: {
      enabled: false,
      fallbackToCacheTimeout: 0
    },
    extra: {
      FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
      FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
      FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
      FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
      FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
      eas: {
        projectId: "TODO-GENERAR-CON-EAS" // Se genera automáticamente con 'eas build:configure'
      }
    }
  }
};
