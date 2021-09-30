// export type UserReportCause = "";
export type UserReportState = "not-seen" | "in-progress" | "closed";
export type UserReportActionTaken =
  | "not-yet-taken"
  | "banned-from-app"
  | "none"
  | "reported-to-authority";

export interface UserReport {
  userReportedID: string;
  // causeGiven: UserReportCause;
  descriptionByUserReporting: string;
}

export interface UserReportOnDatabase {
  userReportingID: string;
  userReportedID: string;
  // causeGiven: UserReportCause;
  descriptionByUserReporting: string;
  state: UserReportState;
  actionTaken: UserReportActionTaken;
}
