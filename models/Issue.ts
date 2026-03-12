import { GovPortalData } from './GovPortalData';
import { User } from './User';
import { Location } from './Location';
import { Media } from './Media';

export interface Issue {
  
  user: User;
  location: Location;
  type: string;
  description: string;
  created_at: string;
  media_urls: Media[];
  gov_portal_data: GovPortalData[];
  vote_count: number;
  verify_count: number;
  status: string;
  rank: number;
}
