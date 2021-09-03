export type UserReportCause = "";
export type UserReportState = "not-seen" | "in-progress" | "closed";
export type UserReportActionTaken =
  | "not-yet-taken"
  | "banned-from-app"
  | "none"
  | "reported-to-authority";

export interface UserReport {
  userReportingID: string;
  userReportedID: string;
  causeGiven: UserReportCause;
  additionalCommentGiven: string;
  state: UserReportState;
  actionTaken: UserReportActionTaken;
}
