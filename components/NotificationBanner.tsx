import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CustomText from '@/components/CustomText';
import { navigateFromNotification } from '@/utils/notificationService';
import { BannerConfig, setNotificationBannerListener } from '@/utils/notificationBannerService';

const AUTO_DISMISS_MS = 10000;
const SLIDE_OFFSET = -130;

const CTA_LABEL: Partial<Record<string, string>> = {
  ISSUE_UPDATE: 'View Issue →',
};

export default function NotificationBanner() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState<BannerConfig | null>(null);
  const translateY = useRef(new Animated.Value(SLIDE_OFFSET)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.timing(translateY, {
      toValue: SLIDE_OFFSET,
      duration: 280,
      useNativeDriver: true,
    }).start(() => setBanner(null));
  }, [translateY]);

  const show = useCallback(
    (config: BannerConfig) => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      setBanner(config);
      translateY.setValue(SLIDE_OFFSET);
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 160,
        useNativeDriver: true,
      }).start();
      dismissTimer.current = setTimeout(dismiss, AUTO_DISMISS_MS);
    },
    [translateY, dismiss],
  );

  useEffect(() => {
    setNotificationBannerListener(show);
    return () => setNotificationBannerListener(null);
  }, [show]);

  const handleTap = () => {
    dismiss();
    if (banner?.data) navigateFromNotification(banner.data);
  };

  if (!banner) return null;

  const bg = dark ? '#1c1c1e' : '#ffffff';
  const border = dark ? '#2c2c2e' : '#e7e9ee';
  const titleColor = dark ? '#f2f2f7' : '#0c1116';
  const bodyColor = dark ? '#aeaeb2' : '#3a424d';
  const closeColor = dark ? '#636366' : '#9aa3b0';
  const cta = banner.data?.type ? CTA_LABEL[banner.data.type] : undefined;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderColor: border,
          top: insets.top + 8,
          transform: [{ translateY }],
        },
      ]}
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
          {cta ? (
            <CustomText style={styles.cta}>{cta}</CustomText>
          ) : null}
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={dismiss} hitSlop={10}>
          <MaterialIcons name="close" size={16} color={closeColor} />
        </TouchableOpacity>
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
    shadowOpacity: 0.12,
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
    backgroundColor: '#22c55e',
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
  cta: {
    fontSize: 12,
    color: '#22c55e',
    fontFamily: 'Nunito_600SemiBold',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    flexShrink: 0,
  },
});
