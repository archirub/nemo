import { Degree, SearchFeatures } from "./search-criteria.model";

export interface mdFromDatabase {
  matchedUsers: string[];
  dislikedUsers: string[];

  fmatchedUsers: string[];
  fdislikedUsers: string[];

  reportedUsers: string[];

  gender: Gender;
  sexualPreference: SexualPreference;

  swipeMode: SwipeMode;
}

export interface mdDatingPickingFromDatabase {
  searchFeatures: SearchFeatures;
  reportedUsers: string[];
  superLikedUsers: string[];
  likedUsers: string[];
}

export interface mdFriendPickingFromDatabase {
  searchFeatures: SearchFeatures;
  reportedUsers: string[];
  fLikedUsers: string[];
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

export interface piStorageUID {
  seenCount: number;
  likeCount: number;
  currentPI: number;
  gender: "male" | "female";
  sexualPreference: "male" | "female";
  degree: Degree;
}

export type piStorage = { uids: string[] } | { [uid: string]: piStorageUID };

export const genderOptions = ["male", "female", "other"] as const;
export type Gender = typeof genderOptions[number];
export const sexualPreferenceOptions = [
  ["male"] as const,
  ["female"] as const,
  ["male", "female"] as const,
] as const;
export type SexualPreference = typeof sexualPreferenceOptions[number];

export const swipeModeOptions = ["friend", "dating"] as const;
export type SwipeMode = typeof swipeModeOptions[number];
