import { Location } from './Location';

export interface Media {
  location: Location;
  type: string;
  url: string;
  url_thumbnail?: string;
  description?: string;
  username?: string;
  profile_photo?: string;
  created_at?: string;
}
