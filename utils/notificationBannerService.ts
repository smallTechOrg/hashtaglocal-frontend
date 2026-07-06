export type BannerConfig = {
  title: string;
  body: string;
  data?: Record<string, string>;
  trayNotificationId?: string;
};

type BannerListener = (config: BannerConfig) => void;

let _listener: BannerListener | null = null;

export function setNotificationBannerListener(fn: BannerListener | null) {
  _listener = fn;
}

export function showNotificationBanner(config: BannerConfig) {
  _listener?.(config);
}
