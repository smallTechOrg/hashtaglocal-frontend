import { Locality } from "./Locality";

export interface Location {
  lat: number;
  lng: number;
  locality: Locality;
  address?: string;
  address_text?: string;
  colloquial_name?: string;
}
