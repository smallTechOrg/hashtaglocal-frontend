import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { authEvents } from "./authEvents";

export interface IssueCount {
  total?: number;
  onhold?: number;
  open?: number;
  resolved?: number;
  verify?: number;
  resolved_others?: number;
}

export interface UserSummary {
  issue_count: IssueCount;
}

export interface UserProfile {
  username: string;
  picture: string;
  hashtag?: string;
  user_summary?: UserSummary;
}

interface UserContextType {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Listen for session expired events from apiClient
  useEffect(() => {
    const unsubscribe = authEvents.onSessionExpired(() => {
      console.log("[UserContext] Session expired event received, clearing user");
      setUser(null);
    });
    return unsubscribe;
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, isLoading, setIsLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
