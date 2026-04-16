import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

export interface IssueMarker {
  id: number;
  type: string;
  description: string;
  created_at: string;
  status?: string;
  user?: { username?: string };
  location: {
    lat: number;
    lng: number;
    locality?: {
      city?: string;
      district?: string;
    };
    address?: string;
  };
  media_urls?: { url: string; url_thumbnail?: string }[];
  vote_count?: number;
  verify_count?: number;
}

interface IssuesContextType {
  issues: IssueMarker[];
  setIssues: (issues: IssueMarker[]) => void;
  /** Maps issueId → thumbnail URL (falls back to full URL if no thumbnail exists) */
  thumbnailCache: Record<number, string>;
}

const IssuesContext = createContext<IssuesContextType | undefined>(undefined);

export function IssuesProvider({ children }: { children: ReactNode }) {
  const [issues, setIssuesState] = useState<IssueMarker[]>([]);

  const setIssues = useCallback((newIssues: IssueMarker[]) => {
    setIssuesState((prev) => {
      if (
        prev.length === newIssues.length &&
        prev.every((p, i) => {
          const n = newIssues[i];
          return (
            p.id === n.id &&
            p.status === n.status &&
            p.verify_count === n.verify_count &&
            p.vote_count === n.vote_count &&
            (p.media_urls?.length ?? 0) === (n.media_urls?.length ?? 0)
          );
        })
      ) {
        return prev;
      }
      return newIssues;
    });
  }, []);

  const thumbnailCache = useMemo(() => {
    const cache: Record<number, string> = {};
    for (const issue of issues) {
      const first = issue.media_urls?.[0];
      if (first) cache[issue.id] = first.url_thumbnail ?? first.url;
    }
    return cache;
  }, [issues]);

  return (
    <IssuesContext.Provider value={{ issues, setIssues, thumbnailCache }}>
      {children}
    </IssuesContext.Provider>
  );
}

export function useIssues() {
  const context = useContext(IssuesContext);
  if (context === undefined) {
    throw new Error("useIssues must be used within an IssuesProvider");
  }
  return context;
}
