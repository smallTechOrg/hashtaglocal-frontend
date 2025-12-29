// TypeScript types matching the Java backend models

export interface User {
  username: string;
  profilePictureUrl: string;
}

export interface Locality {
  hashtags: string[];
}

export interface Location {
  lat: string;
  lng: string;
  locality: Locality;
  address: string;
  colloquialName: string;
}

export interface Media {
  location: Location;
  type: string;
  url: string;
}

export interface Issue {
  user: User;
  location: Location;
  type: string;
  description: string;
  created_at: string;
  media_urls: Media[];
  vote_count: number;
  verify_count: number;
  status: string;
  rank: number;
}

export interface ViewerContext {
  hasVoted: boolean;
}

export interface ResponseData {
  issue: Issue;
  viewerContext: ViewerContext;
}

export interface APIResponse {
  data: ResponseData;
}

