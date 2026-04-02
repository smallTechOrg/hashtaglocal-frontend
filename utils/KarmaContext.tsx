import { createContext, ReactNode, useCallback, useContext, useState } from "react";

export interface KarmaState {
  earned: number;
  pending: number;
}

interface KarmaContextType {
  karma: KarmaState;
  setKarma: (earned: number, pending: number) => void;
  addPendingKarma: (points: number) => void;
  /** Latest karma delta for animation triggers — resets to 0 after consumption */
  lastDelta: number;
  clearDelta: () => void;
}

const KarmaContext = createContext<KarmaContextType | undefined>(undefined);

export function KarmaProvider({ children }: { children: ReactNode }) {
  const [karma, setKarmaState] = useState<KarmaState>({ earned: 0, pending: 0 });
  const [lastDelta, setLastDelta] = useState(0);

  const setKarma = useCallback((earned: number, pending: number) => {
    setKarmaState({ earned, pending });
  }, []);

  const addPendingKarma = useCallback((points: number) => {
    setKarmaState((prev) => ({ ...prev, pending: prev.pending + points }));
    setLastDelta(points);
  }, []);

  const clearDelta = useCallback(() => {
    setLastDelta(0);
  }, []);

  return (
    <KarmaContext.Provider value={{ karma, setKarma, addPendingKarma, lastDelta, clearDelta }}>
      {children}
    </KarmaContext.Provider>
  );
}

export function useKarma() {
  const context = useContext(KarmaContext);
  if (context === undefined) {
    throw new Error("useKarma must be used within a KarmaProvider");
  }
  return context;
}
