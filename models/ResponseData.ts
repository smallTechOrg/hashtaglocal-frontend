import { Issue } from './Issue';
import { ViewerContext } from './ViewerContext';

export interface ResponseData {
  issue: Issue;
  viewerContext: ViewerContext;
}
