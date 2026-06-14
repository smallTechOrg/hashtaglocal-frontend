import { getApp } from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

// Background handler must be registered before React mounts.
// This runs when the app is killed and a data/notification message arrives.
setBackgroundMessageHandler(getMessaging(getApp()), async remoteMessage => {
  console.log('[FCM] Background message:', remoteMessage.messageId);
});

// Required by notifee even if empty — navigation is handled via getInitialNotification on app open.
notifee.onBackgroundEvent(async () => {});

require('expo-router/entry');
