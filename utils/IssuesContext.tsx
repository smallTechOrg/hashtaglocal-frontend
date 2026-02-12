import { createContext, ReactNode, useContext, useState } from "react";

export interface IssueMarker {
  id: number;
  type: string;
  description: string;
  created_at: string;
  status?: string;
  location: {
    lat: number;
    lng: number;
    locality?: {
      city?: string;
      district?: string;
    };
    address?: string;
  };
  media_urls?: Array<{ url: string }>;
  vote_count?: number;
  verify_count?: number;
}

interface IssuesContextType {
  issues: IssueMarker[];
  setIssues: (issues: IssueMarker[]) => void;
}

const IssuesContext = createContext<IssuesContextType | undefined>(undefined);

export function IssuesProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<IssueMarker[]>([]);

  return (
    <IssuesContext.Provider value={{ issues, setIssues }}>
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
