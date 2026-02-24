import { MaterialIcons } from "@expo/vector-icons";

export type BannerVariant = "loading" | "error" | "success";

export interface StatusBannerProps {
  variant: BannerVariant;
  message: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}
