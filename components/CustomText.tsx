import { StyleSheet, Text, TextProps } from "react-native";

type CustomTextProps = TextProps & {
  children: React.ReactNode;
  className?: string;
};

const weightToFamily: Record<string, string> = {
  "200": "Nunito_200ExtraLight",
  "300": "Nunito_300Light",
  "400": "Nunito_400Regular",
  "500": "Nunito_500Medium",
  "600": "Nunito_600SemiBold",
  "700": "Nunito_700Bold",
  "800": "Nunito_800ExtraBold",
  bold: "Nunito_700Bold",
  semibold: "Nunito_600SemiBold",
  medium: "Nunito_500Medium",
  light: "Nunito_300Light",
  extralight: "Nunito_200ExtraLight",
  normal: "Nunito_400Regular",
};

function resolveFontFamily(
  className?: string,
  style?: TextProps["style"]
): string {
  // Parse className for patterns like font-[600], font-bold, font-light, etc.
  if (className) {
    const bracketMatch = className.match(/\bfont-\[(\d+)\]/);
    if (bracketMatch) return weightToFamily[bracketMatch[1]] ?? "Nunito_400Regular";

    for (const key of Object.keys(weightToFamily)) {
      if (/^\d+$/.test(key)) continue; // skip numeric keys here
      if (className.includes(`font-${key}`)) return weightToFamily[key];
    }
  }

  // Fall back to fontWeight in style prop
  const flat = StyleSheet.flatten(style);
  const fw = flat?.fontWeight as string | undefined;
  if (fw) return weightToFamily[fw] ?? "Nunito_400Regular";

  return "Nunito_400Regular";
}

export default function CustomText({
  children,
  style,
  className,
  ...props
}: CustomTextProps) {
  const fontFamily = resolveFontFamily(className, style);

  return (
    <Text
      {...props}
      className={className}
      style={[{ fontFamily }, style]}
    >
      {children}
    </Text>
  );
}
