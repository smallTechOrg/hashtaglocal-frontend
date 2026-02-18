export const ISSUE_TYPES = [
  { id: "POTHOLE", label: "Potholes & Road Damages", icon: "construction" },
  { id: "WASTE", label: "Waste & Garbage Disposal", icon: "delete-outline" },
  { id: "FOOTPATH", label: "Footpath & Walkability Issues", icon: "directions-walk" },
  { id: "POLLUTION", label: "Air, Noise or Water Pollution", icon: "air" },
  { id: "HYGIENE", label: "Hygiene & Sanitation", icon: "cleaning-services" },
  { id: "SAFETY", label: "Safety & Street Lighting", icon: "lightbulb-outline" },
  { id: "OTHER", label: "Other Community Issues", icon: "help-outline" },
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number]["id"];
