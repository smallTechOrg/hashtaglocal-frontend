import { createContext, ReactNode, useContext, useMemo, useState } from "react";

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
  const [issues, setIssues] = useState<IssueMarker[]>([]);

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
