import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useUser } from "./UserContext";

const STORAGE_KEY = "htl_selected_hashtag";
const RECENT_KEY = "htl_recent_hashtags";
const ROOT = "india";
const MAX_RECENT = 5;

interface HashtagContextType {
  /** Normalized selected hashtag, no leading '#'. e.g. "bengaluru" or "india". */
  hashtag: string;
  /** True when the root (#india) is selected — tabs treat this as "all localities". */
  isRoot: boolean;
  /** Recently-visited hashtags, most-recent first (excludes #india and the current one). */
  recent: string[];
  setHashtag: (hashtag: string) => void;
}

const HashtagContext = createContext<HashtagContextType | undefined>(undefined);

const normalize = (h?: string | null) => (h || "").replace(/^#/, "").toLowerCase();

export function HashtagProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const [hashtag, setHashtagState] = useState<string>(ROOT);
  const [recent, setRecent] = useState<string[]>([]);
  // A deliberate choice (or restored value) wins over later auto-defaulting to the user's home tag.
  const lockedRef = useRef(false);

  // Restore a previously chosen hashtag + recents (sticky across sessions).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && !lockedRef.current) {
          lockedRef.current = true;
          setHashtagState(normalize(saved));
        }
      })
      .catch(() => {});
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) setRecent(list.filter((x) => typeof x === "string"));
          } catch {
            /* ignore malformed */
          }
        }
      })
      .catch(() => {});
  }, []);

  // Default to the user's home hashtag once the profile loads — but only if the user hasn't
  // already chosen one (and there was no saved value).
  useEffect(() => {
    if (lockedRef.current) return;
    const home = normalize(user?.hashtag);
    if (home) setHashtagState(home);
  }, [user?.hashtag]);

  const setHashtag = useCallback((next: string) => {
    const n = normalize(next);
    lockedRef.current = true;
    setHashtagState(n);
    AsyncStorage.setItem(STORAGE_KEY, n).catch(() => {});

    // Record in recents (skip the root; most-recent first; cap the list).
    if (n !== ROOT) {
      setRecent((prev) => {
        const nextList = [n, ...prev.filter((x) => x !== n)].slice(0, MAX_RECENT);
        AsyncStorage.setItem(RECENT_KEY, JSON.stringify(nextList)).catch(() => {});
        return nextList;
      });
    }
  }, []);

  // Recents shown in the picker exclude the currently-selected tag (it has its own checkmark above).
  const visibleRecent = recent.filter((h) => h !== hashtag);

  return (
    <HashtagContext.Provider
      value={{ hashtag, isRoot: hashtag === ROOT, recent: visibleRecent, setHashtag }}
    >
      {children}
    </HashtagContext.Provider>
  );
}

export function useHashtag() {
  const ctx = useContext(HashtagContext);
  if (!ctx) throw new Error("useHashtag must be used within a HashtagProvider");
  return ctx;
}
