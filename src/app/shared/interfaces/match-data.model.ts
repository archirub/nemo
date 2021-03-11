import { Degree, SearchFeatures } from "./search-criteria.model";

export interface UidDateMap {
  [uid: string]: dateMap;
}

export interface dateMap {
  exists: true;
  date: firebase.firestore.Timestamp;
}

export interface mdFromDatabase {
  matchedUsers: UidDateMap;
  dislikedUsers: UidDateMap;

  fmatchedUsers: UidDateMap;
  fdislikedUsers: UidDateMap;

  reportedUsers: UidDateMap;

  gender: Gender;
  sexualPreference: SexualPreference;

  // showProfile: Boolean;
  percentile: number;
  swipeMode: SwipeMode;
}

export interface mdDatingPickingFromDatabase {
  searchFeatures: SearchFeatures;
  reportedUsers: UidDateMap;
  superLikedUsers: UidDateMap;
  likedUsers: UidDateMap;
}

export interface mdFriendPickingFromDatabase {
  searchFeatures: SearchFeatures;
  reportedUsers: UidDateMap;
  fLikedUsers: UidDateMap;
}

export interface userInfoFromMatchData {
  gender: Gender;
  sexualPreference: SexualPreference;
  swipeMode: SwipeMode;
}

export interface uidDatingStorage {
  volume: number;
  sexualPreference: "male" | "female";
  gender: "male" | "female";
  degree: Degree;
  uids: string[];
}

export interface uidFriendStorage {
  volume: number;
  uids: string[];
}

export interface SwipeUserInfo {
  seenCount: number;
  likeCount: number;
  percentile: number | null;
  gender: Gender;
  sexualPreference: SexualPreference;
  degree: Degree;
  showProfile: Boolean;
  swipeMode: SwipeMode;
}

export type piStorage = { uids: string[] } | { [uid: string]: SwipeUserInfo };

export const genderOptions = ["male", "female", "other"] as const;
export type Gender = "male" | "female" | "other";
export const sexualPreferenceOptions = [
  ["male"],
  ["female"],
  ["male", "female"],
] as const;
export type SexualPreference = ["male"] | ["female"] | ["male", "female"];

export const swipeModeOptions = ["friend", "dating"] as const;
export type SwipeMode = typeof swipeModeOptions[number];
