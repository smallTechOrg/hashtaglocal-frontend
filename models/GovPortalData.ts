export interface GovPortalData {
  tracking_id: string;
  status: string;
  portal_name: string;
  portal_track_link: string;
  meta_data?: Record<string, any>;
  updated_at?: string;
  created_at?: string;
}