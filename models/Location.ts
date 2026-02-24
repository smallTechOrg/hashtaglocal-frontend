import { Locality } from "./Locality";

export interface LocationMetaData {
  city: string | null;
  district: string | null;
  street_number: string | null;
  street: string | null;
  region: string | null;
  sub_region: string | null;
  country: string | null;
  postal_code: string | null;
  name: string | null;
  iso_country_code: string | null;
  timezone: string | null;
  formatted_address: string | null;
}

export interface Location {
  lat: number;
  lng: number;
  locality: Locality;
  address?: string;
  colloquial_name?: string;
}
