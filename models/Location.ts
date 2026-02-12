import { Locality } from "./Locality";

export interface Location {
  lat: number;
  lng: number;
  locality: Locality;
  address?: string;
  colloquial_name?: string;
}
