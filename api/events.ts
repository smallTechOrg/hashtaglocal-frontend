import { apiGet } from "@/utils/apiClient";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export interface Event {
  id: number;
  name: string;
  organisation: string;
  image_url: string;
  portal: string;
  type: string;
  start_time: string;
  end_time: string | null;
  location: {
    lat: number;
    lng: number;
    name: string;
    locality: {
      hashtags: string[];
    };
  };
  address: string;
  link: string;
  meta_data: null | Record<string, unknown>;
}

export interface EventsResponse {
  data: {
    events: Event[];
  };
}

export async function fetchEvents(): Promise<Event[]> {
  const url = `${API_BASE_URL}/api/v1/events`;

  const response = await apiGet(url, { skipAuth: true });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch events: ${response.status} - ${errorText}`);
  }

  const data: EventsResponse = await response.json();
  return data.data.events;
}
