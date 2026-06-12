import { BulletinQuizAttempt } from "@/api/bulletin";
import { createFeedPost } from "@/api/Feed";
import BulletinOverlay from "@/components/bulletin/BulletinOverlay";
import ChatBulletinCard from "@/components/chat/ChatBulletinCard";
import ChatIssueRefCard from "@/components/chat/ChatIssueRefCard";
import ChatLinkCard from "@/components/chat/ChatLinkCard";
import ChatMediaCard from "@/components/chat/ChatMediaCard";
import CustomText from "@/components/CustomText";
import { CreateFeedPostRequest, FeedPost } from "@/models/Feed";
import { useHashtag } from "@/utils/HashtagContext";
import {
  getBestKnownLocation,
  getFastLocationWithProgressiveWatch,
} from "@/utils/LocationService";
import { useFeed } from "@/utils/useFeed";
import { useUser } from "@/utils/UserContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const ACCENT = "#256d1b";

/** "just now / 5m / 3h / 2d" — backend sends zone-less UTC, so append Z when missing. */
function timeAgo(dateString?: string): string {
  if (!dateString) return "";
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(dateString);
  const date = new Date(hasZone ? dateString : `${dateString}Z`);
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function ChatScreen() {
  const { user } = useUser();
  const loggedIn = Boolean(user);
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  // The selected hashtag is global (header dropdown) — shared across all tabs.
  const { hashtag, isRoot } = useHashtag();

  const { posts, loading, loadingMore, error, hasMore, loadMore, reload } = useFeed(hashtag, {
    aggregate: isRoot,
  });

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [bulletinPost, setBulletinPost] = useState<FeedPost | null>(null);
  // Cache quiz attempts locally so reopening the overlay shows the result, not "Start Quiz".
  const attemptCache = useRef<Map<number, BulletinQuizAttempt>>(new Map());

  function openBulletin(post: FeedPost) {
    const quizId = post.bulletin?.quiz?.id;
    const cached = quizId != null ? attemptCache.current.get(quizId) : undefined;
    if (cached && post.bulletin?.quiz) {
      setBulletinPost({
        ...post,
        bulletin: {
          ...post.bulletin,
          quiz: { ...post.bulletin.quiz, attempt: cached },
        },
      });
    } else {
      setBulletinPost(post);
    }
  }

  const data = useMemo(() => posts, [posts]);

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    if (!loggedIn) {
      router.push("/login");
      return;
    }
    setPostError(null);
    setSending(true);
    try {
      let loc = getBestKnownLocation();
      if (!loc) {
        const res = await getFastLocationWithProgressiveWatch({ instantLoad: true });
        if (res.success) loc = res.location;
      }
      if (!loc) {
        setPostError("Location needed to post. Enable location and try again.");
        return;
      }
      const body: CreateFeedPostRequest = {
        kind: "TEXT",
        text: trimmed,
        lat: loc.latitude,
        lng: loc.longitude,
      };
      await createFeedPost(body);
      setText("");
      reload();
    } catch (e) {
      setPostError(e instanceof Error ? e.message : "Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  }, [text, sending, loggedIn, reload]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={headerHeight}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={ACCENT} />
            <CustomText style={styles.muted}>Loading chat…</CustomText>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <CustomText style={styles.muted}>Couldn&apos;t load chat. {error}</CustomText>
            <TouchableOpacity onPress={reload} style={styles.retryBtn}>
              <CustomText style={styles.retryText}>Retry</CustomText>
            </TouchableOpacity>
          </View>
        ) : data.length === 0 ? (
          <View style={styles.center}>
            <CustomText style={styles.muted}>No messages yet. Say something.</CustomText>
          </View>
        ) : (
          <FlatList
            inverted
            data={data}
            keyExtractor={(p) => String(p.id)}
            renderItem={({ item }) => <ChatRow post={item} showTag={isRoot} onOpenBulletin={openBulletin} />}
            contentContainerStyle={styles.listContent}
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={ACCENT} />
                </View>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
        )}

        {/* Compose bar — hugs the keyboard / tab bar, no dead gap. */}
        <View style={styles.composeWrap}>
          {postError && <CustomText style={styles.postError}>{postError}</CustomText>}
          <View style={styles.composeRow}>
            <TextInput
              style={styles.input}
              placeholder={loggedIn ? `Message #${hashtag}…` : "Sign in to chat"}
              placeholderTextColor="#9aa3b0"
              value={text}
              onChangeText={setText}
              editable={!sending}
              multiline
              onFocus={() => {
                if (!loggedIn) router.push("/login");
              }}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={submit}
              disabled={!text.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialIcons name="send" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {bulletinPost && (
        <BulletinOverlay
          post={bulletinPost}
          onClose={() => setBulletinPost(null)}
          headerHeight={headerHeight}
          tabBarHeight={tabBarHeight}
          onAttempted={(quizId, attempt) => {
            attemptCache.current.set(quizId, attempt);
          }}
        />
      )}
    </View>
  );
}

/** One message row. Greyed with an "under review" badge when it's the viewer's own not-yet-
 * published post (the API only returns such posts to their author). */
function ChatRow({
  post,
  showTag,
  onOpenBulletin,
}: {
  post: FeedPost;
  showTag?: boolean;
  onOpenBulletin?: (post: FeedPost) => void;
}) {
  const isSystem = !post.author;
  const name = isSystem ? "#local" : post.author?.username ?? "member";
  const tag = post.hashtag?.replace(/^#/, "");
  const underReview = post.status !== "PUBLISHED";

  return (
    <View style={[styles.msg, underReview && styles.msgUnderReview]}>
      <View style={styles.msgHeader}>
        <CustomText style={[styles.author, isSystem && styles.authorSystem]} numberOfLines={1}>
          {name}
        </CustomText>
        {showTag && tag ? <CustomText style={styles.msgTag}>#{tag}</CustomText> : null}
        <CustomText style={styles.msgTime}>{timeAgo(post.created_at)}</CustomText>
        {underReview && <CustomText style={styles.reviewBadge}>under review</CustomText>}
      </View>
      <ChatBody post={post} onOpenBulletin={onOpenBulletin} />
    </View>
  );
}

/** Body by kind — rich cards for ISSUE_REF / LINK / MEDIA, summary line for EVENT_REF, text else. */
function ChatBody({
  post,
  onOpenBulletin,
}: {
  post: FeedPost;
  onOpenBulletin?: (post: FeedPost) => void;
}) {
  switch (post.kind) {
    case "ISSUE_REF":
      return <ChatIssueRefCard issueId={post.issue_id} fallbackText={post.text} />;
    case "LINK":
      return <ChatLinkCard post={post} />;
    case "MEDIA":
      return <ChatMediaCard post={post} />;
    case "BULLETIN":
      return <ChatBulletinCard post={post} onOpen={onOpenBulletin ?? (() => {})} />;
    case "EVENT_REF":
      return (
        <View style={styles.eventRef}>
          <MaterialIcons name="event" size={15} color={ACCENT} />
          <CustomText style={styles.eventRefText}>{post.text ?? "Upcoming event"}</CustomText>
        </View>
      );
    default:
      return <CustomText style={styles.bodyText}>{post.text}</CustomText>;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  muted: { color: "#5b6573", textAlign: "center" },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  retryText: { color: "#fff" },
  listContent: { paddingHorizontal: 12, paddingVertical: 8 },
  loadingMore: { paddingVertical: 12 },
  msg: { paddingVertical: 5 },
  msgUnderReview: { opacity: 0.55 },
  msgHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 },
  author: { fontSize: 13, color: "#7c3aed", maxWidth: 140 },
  authorSystem: { color: "#0c8f5f" },
  msgTag: { fontSize: 11, color: "#0c8f5f" },
  msgTime: { fontSize: 11, color: "#9aa3b0" },
  reviewBadge: {
    fontSize: 9,
    color: "#b45309",
    backgroundColor: "rgba(245,158,11,0.16)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
  bodyText: { fontSize: 14, color: "#0c1116", lineHeight: 20 },
  eventRef: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#f1f8f0",
    borderRadius: 10,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  eventRefText: { fontSize: 13, color: "#0c1116" },
  composeWrap: {
    borderTopWidth: 1,
    borderTopColor: "#e7e9ee",
    backgroundColor: "#f6f7f9",
    paddingBottom: 8,
  },
  postError: { color: "#dc2626", fontSize: 12, paddingHorizontal: 12, paddingTop: 6 },
  composeRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    borderWidth: 1,
    borderColor: "#e7e9ee",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontFamily: "Nunito_400Regular",
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#0c1116",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.45 },
});
