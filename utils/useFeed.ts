import { fetchFeedTimeline } from "@/api/Feed";
import { FeedPost } from "@/models/Feed";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 30;

interface UseFeedResult {
  pinned: FeedPost[];
  posts: FeedPost[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

interface UseFeedOptions {
  /** When true, the backend aggregates this (root) hashtag's feed with all its children. */
  aggregate?: boolean;
}

/**
 * Loads a hashtag's feed timeline with keyset pagination (newest-first from the API). Mirrors the
 * web useFeed hook. Reads are public; the token (if any) is attached by the api layer so the
 * viewer's own under-review posts come back.
 */
export function useFeed(
  hashtag: string | null,
  options: UseFeedOptions = {},
): UseFeedResult {
  const { aggregate = false } = options;
  const [pinned, setPinned] = useState<FeedPost[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // Guards against a stale in-flight request applying after the hashtag changed.
  const reqIdRef = useRef(0);

  const fetchPage = useCallback(
    async (cursor: string | null, append: boolean, reqId: number) => {
      const body = await fetchFeedTimeline(hashtag as string, {
        cursor: cursor ?? undefined,
        limit: PAGE_SIZE,
        aggregate,
      });
      if (reqId !== reqIdRef.current) return; // superseded
      const data = body.data ?? {};
      cursorRef.current = data.next_cursor ?? null;
      setHasMore(Boolean(data.next_cursor));
      if (append) {
        setPosts((prev) => [...prev, ...(data.posts ?? [])]);
      } else {
        setPinned(data.pinned ?? []);
        setPosts(data.posts ?? []);
      }
    },
    [hashtag, aggregate],
  );

  const reload = useCallback(() => {
    if (!hashtag) return;
    const reqId = ++reqIdRef.current;
    cursorRef.current = null;
    setLoading(true);
    setError(null);
    fetchPage(null, false, reqId)
      .catch((e) => {
        if (reqId === reqIdRef.current) {
          setError(e instanceof Error ? e.message : "Couldn't load chat.");
        }
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setLoading(false);
      });
  }, [hashtag, fetchPage]);

  const loadMore = useCallback(() => {
    if (!hashtag || loadingMore || !cursorRef.current) return;
    const reqId = reqIdRef.current; // same channel; don't bump
    setLoadingMore(true);
    fetchPage(cursorRef.current, true, reqId)
      .catch(() => {
        /* keep what we have; a transient older-page failure shouldn't surface */
      })
      .finally(() => setLoadingMore(false));
  }, [hashtag, loadingMore, fetchPage]);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashtag, aggregate]);

  return { pinned, posts, loading, loadingMore, error, hasMore, loadMore, reload };
}
