import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomText from '@/components/CustomText';
import { trackNotificationOpened } from '@/utils/analytics';
import { navigateFromNotification } from '@/utils/notificationService';
import { BannerConfig, setNotificationBannerListener } from '@/utils/notificationBannerService';
import { cancelSystemTrayNotification } from '@/utils/notificationTray';

const AUTO_DISMISS_MS = 10000;
const ENTRY_OFFSET = -130;
const SWIPE_THRESHOLD = 60;

export default function NotificationBanner() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState<BannerConfig | null>(null);
  const bannerRef = useRef<BannerConfig | null>(null);
  const translateY = useRef(new Animated.Value(ENTRY_OFFSET)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);

  const dismiss = useCallback(
    (toX = 0, toY = ENTRY_OFFSET) => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      Animated.timing(toX !== 0 ? translateX : translateY, {
        toValue: toX !== 0 ? toX : toY,
        duration: 260,
        useNativeDriver: true,
      }).start(() => {
        translateX.setValue(0);
        translateY.setValue(ENTRY_OFFSET);
        bannerRef.current = null;
        setBanner(null);
      });
    },
    [translateX, translateY],
  );

  const show = useCallback(
    (config: BannerConfig) => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      bannerRef.current = config;
      setBanner(config);
      translateX.setValue(0);
      translateY.setValue(ENTRY_OFFSET);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 160,
        useNativeDriver: true,
      }).start();
      dismissTimer.current = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
    },
    [translateX, translateY, dismiss],
  );

  useEffect(() => {
    setNotificationBannerListener(show);
    return () => setNotificationBannerListener(null);
  }, [show]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 8 || dy < -8,
      onPanResponderGrant: () => {
        isDragging.current = true;
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
      },
      onPanResponderMove: (_, { dx, dy }) => {
        if (Math.abs(dx) >= Math.abs(dy)) {
          translateX.setValue(dx);
        } else if (dy < 0) {
          translateY.setValue(dy);
        }
      },
      onPanResponderRelease: (_, { dx, dy, vx, vy }) => {
        isDragging.current = false;
        const swipedH = Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.8;
        const swipedUp = dy < -SWIPE_THRESHOLD || vy < -0.8;
        if (swipedH) {
          if (bannerRef.current?.trayNotificationId) {
            cancelSystemTrayNotification(bannerRef.current.trayNotificationId);
          }
          dismiss(dx > 0 ? 400 : -400, 0);
        } else if (swipedUp) {
          if (bannerRef.current?.trayNotificationId) {
            cancelSystemTrayNotification(bannerRef.current.trayNotificationId);
          }
          dismiss(0, ENTRY_OFFSET);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
          dismissTimer.current = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
        }
      },
    }),
  ).current;

  const handleTap = () => {
    if (isDragging.current) return;
    if (banner?.trayNotificationId) cancelSystemTrayNotification(banner.trayNotificationId);
    dismiss();
    if (banner?.data) {
      trackNotificationOpened(banner.data.notificationLogId ?? 'unknown', banner.data.type ?? 'unknown');
      navigateFromNotification(banner.data);
    }
  };

  if (!banner) return null;

  const bg = dark ? '#1c1c1e' : '#ffffff';
  const border = dark ? '#2c2c2e' : '#e5e7eb';
  const titleColor = dark ? '#f2f2f7' : '#0c1116';
  const bodyColor = dark ? '#aeaeb2' : '#3a424d';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderColor: border,
          top: insets.top + 8,
          transform: [{ translateY }, { translateX }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity style={styles.inner} onPress={handleTap} activeOpacity={0.85}>
        <View style={styles.iconWrap}>
          <Image
            source={require('../assets/notification-icon.png')}
            style={styles.icon}
            contentFit="contain"
          />
        </View>

        <View style={styles.textWrap}>
          <CustomText style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {banner.title}
          </CustomText>
          <CustomText style={[styles.body, { color: bodyColor }]} numberOfLines={2}>
            {banner.body}
          </CustomText>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#256D1B',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: {
    width: 26,
    height: 26,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
  },
  body: {
    fontSize: 13,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 18,
  },
});
