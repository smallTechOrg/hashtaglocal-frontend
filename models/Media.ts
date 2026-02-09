import { Location } from './Location';

export interface Media {
  location: Location;
  type: string;
  url: string;
  description?: string;
  username?: string;
  profile_photo?: string;
  created_at?: string;
}
