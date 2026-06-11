import { IssueType } from "@/constants/issueTypes";
import { LocationMetaData } from "@/models/Location";

export interface IssueSubmitParams {
  selectedType: IssueType | null;
  gcsPath: string | null;
  latitude: string | null;
  longitude: string | null;
  description: string;
  locationMetaData: LocationMetaData;
  isUpdateMode: boolean;
  issueId?: string;
  onSuccess?: () => void;
}
