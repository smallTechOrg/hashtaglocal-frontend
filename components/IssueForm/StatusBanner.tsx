import CustomText from "@/components/CustomText";
import { BannerVariant, StatusBannerProps } from "@/models/StatusBannerProps";
import { MaterialIcons } from "@expo/vector-icons";
import { ActivityIndicator, View } from "react-native";

const VARIANT_STYLES: Record<
  BannerVariant,
  { bg: string; border: string; textColor: string; iconColor: string }
> = {
  loading: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    textColor: "text-yellow-700",
    iconColor: "#CA8A04",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    textColor: "text-red-700",
    iconColor: "#DC2626",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    textColor: "text-green-700",
    iconColor: "#16A34A",
  },
};

export default function StatusBanner({
  variant,
  message,
  icon,
}: StatusBannerProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <View
      className={`${styles.bg} p-4 mx-3 mt-3 rounded-xl border ${styles.border}`}
    >
      <View className="flex-row items-center">
        {variant === "loading" ? (
          <ActivityIndicator size="small" color={styles.iconColor} />
        ) : (
          <MaterialIcons
            name={icon || (variant === "error" ? "error-outline" : "check-circle")}
            size={20}
            color={styles.iconColor}
          />
        )}
        <CustomText className={`ml-3 ${styles.textColor} font-medium`}>
          {message}
        </CustomText>
      </View>
    </View>
  );
}
