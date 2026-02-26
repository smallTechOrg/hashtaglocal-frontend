import { Issue } from './Issue';
import { ViewerContext } from './ViewerContext';

export interface ResponseData {
  issue: Issue;
  viewer_context: ViewerContext;
}
