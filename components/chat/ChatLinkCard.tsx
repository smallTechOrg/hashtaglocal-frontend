import CustomText from "@/components/CustomText";
import { FeedPost } from "@/models/Feed";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, TouchableOpacity, View } from "react-native";

/** Rich link preview for a LINK chat message: hero image + site name (favicon) + title, tappable
 * to open the URL. Mirrors the web link card. Shows a "Loading preview…" state while the backend
 * is still scraping. */
export default function ChatLinkCard({ post }: { post: FeedPost }) {
  const data = (post.data ?? {}) as Record<string, unknown>;
  const siteName = typeof data.site_name === "string" ? data.site_name : undefined;
  const favicon = typeof data.favicon_url === "string" ? data.favicon_url : undefined;
  const pending = post.scrape_status === "PENDING";

  let host = "";
  try {
    host = post.url ? new URL(post.url).host.replace(/^www\./, "") : "";
  } catch {
    host = "";
  }

  const open = () => {
    if (post.url) WebBrowser.openBrowserAsync(post.url);
  };

  return (
    <View>
      {post.text ? <CustomText style={styles.caption}>{post.text}</CustomText> : null}
      <TouchableOpacity style={styles.card} onPress={open} activeOpacity={0.85}>
        {post.image_url ? (
          <Image
            source={{ uri: post.image_url }}
            style={styles.hero}
            contentFit="cover"
            transition={150}
          />
        ) : null}
        <View style={styles.body}>
          <View style={styles.siteRow}>
            {favicon ? (
              <Image source={{ uri: favicon }} style={styles.favicon} contentFit="contain" />
            ) : (
              <MaterialIcons name="link" size={12} color="#9aa3b0" />
            )}
            <CustomText style={styles.site} numberOfLines={1}>
              {siteName ?? host}
            </CustomText>
          </View>
          <CustomText style={styles.title} numberOfLines={2}>
            {post.title ?? (pending ? "Loading preview…" : post.url)}
          </CustomText>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 14, color: "#0c1116", lineHeight: 20, marginBottom: 4 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e7e9ee",
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 2,
    maxWidth: 320,
  },
  hero: { width: "100%", height: 150, backgroundColor: "#f1f3f5" },
  body: { padding: 10, gap: 3 },
  siteRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  favicon: { width: 14, height: 14, borderRadius: 3 },
  site: { fontSize: 11, color: "#9aa3b0", textTransform: "lowercase", flexShrink: 1 },
  title: { fontSize: 14, color: "#0c1116", lineHeight: 19 },
});
