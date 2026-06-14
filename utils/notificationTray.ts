import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

let _channelId: string | null = null;

async function getChannelId(): Promise<string> {
  if (_channelId) return _channelId;
  _channelId = await notifee.createChannel({
    id: 'default',
    name: 'Notifications',
    importance: AndroidImportance.HIGH,
  });
  return _channelId;
}

export async function postToSystemTray(
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<string> {
  const channelId = await getChannelId();
  return notifee.displayNotification({
    title,
    body,
    data,
    android: { channelId, pressAction: { id: 'default' }, color: '#256D1B', smallIcon: 'notification_icon' },
  });
}

export function cancelSystemTrayNotification(id: string): void {
  notifee.cancelNotification(id).catch(() => {});
}

export function setupNotifeeForegroundHandler(
  navigate: (data: Record<string, string>) => void,
): () => void {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS && detail.notification?.data) {
      navigate(detail.notification.data as Record<string, string>);
    }
  });
}

export async function consumeNotifeeInitialNotification(): Promise<Record<string, string> | null> {
  const initial = await notifee.getInitialNotification();
  if (initial?.notification?.data) {
    return initial.notification.data as Record<string, string>;
  }
  return null;
}
