import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

// Background handler must be registered before React mounts.
// This runs when the app is killed and a data/notification message arrives.
setBackgroundMessageHandler(getMessaging(getApp()), async remoteMessage => {
  console.log('[FCM] Background message:', remoteMessage.messageId);
});

require('expo-router/entry');
