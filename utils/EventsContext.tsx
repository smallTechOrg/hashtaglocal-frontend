import { Event, fetchEvents } from "@/api/events";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface EventsContextType {
  events: Event[];
  loading: boolean;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents()
      .catch(() => [])
      .then((data) => setEvents(data as Event[]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <EventsContext.Provider value={{ events, loading }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (context === undefined) {
    throw new Error("useEvents must be used within an EventsProvider");
  }
  return context;
}
