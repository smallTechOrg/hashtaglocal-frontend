import CustomText from "@/components/CustomText";
import { FeedPost } from "@/models/Feed";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

/** A MEDIA chat message: caption (if any) + the photo. */
export default function ChatMediaCard({ post }: { post: FeedPost }) {
  return (
    <View>
      {post.text ? <CustomText style={styles.caption}>{post.text}</CustomText> : null}
      {post.media_url ? (
        <Image
          source={{ uri: post.media_url }}
          style={styles.media}
          contentFit="cover"
          transition={150}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 14, color: "#0c1116", lineHeight: 20, marginBottom: 4 },
  media: {
    width: "100%",
    maxWidth: 320,
    height: 200,
    borderRadius: 14,
    backgroundColor: "#f1f3f5",
    marginTop: 2,
  },
});
