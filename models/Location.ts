import { Locality } from "./Locality";

export interface Location {
  lat: string;
  lng: string;
  locality: Locality;
  address: string;
  colloquialName: string;
}
