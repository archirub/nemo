import { FirestoreTimestamp } from "./firebase.model";
import {
  AreaOfStudy,
  Degree,
  SearchFeatures,
  SocietyCategory,
} from "./search-criteria.model";

export interface UidDateMap {
  [uid: string]: dateMap;
}

export interface dateMap {
  exists: true;
  date: FirestoreTimestamp;
}

export interface mdMainFromDatabase {
  matchedUsers: UidDateMap;
  dislikedUsers: UidDateMap;

  fmatchedUsers: UidDateMap;
  fdislikedUsers: UidDateMap;

  reportedUsers: UidDateMap;

  gender: Gender;
  sexualPreference: SexualPreference;

  swipeMode: SwipeMode;

  uidCount: number;
}

export interface mdDatingPickingFromDatabase {
  searchFeatures: SearchFeatures;
  reportedUsers: UidDateMap;
  superLikedUsers: UidDateMap;
  likedUsers: UidDateMap;

  uidCount: number;
}

export interface mdFriendPickingFromDatabase {
  searchFeatures: SearchFeatures;
  reportedUsers: UidDateMap;
  fLikedUsers: UidDateMap;

  uidCount: number;
}

export interface userInfoFromMatchData {
  gender: Gender;
  sexualPreference: SexualPreference;
  swipeMode: SwipeMode;
}

export interface userInfoFromPickingData {
  societyCategory: SocietyCategory;
  areaOfStudy: AreaOfStudy;
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
  showProfile: boolean;
  swipeMode: SwipeMode;
}

export interface piStorageDefault {
  uids: string[];
  uidCount: number;
}
export interface piStorageUidMaps {
  [uid: string]: SwipeUserInfo;
}
export type piStorage = piStorageDefault & piStorageUidMaps;

export const swipeModeOptions = ["friend" as const, "dating" as const];
export type SwipeMode = typeof swipeModeOptions[number];

export const genderOptions = ["male" as const, "female" as const, "trans" as const];
export type Gender = typeof genderOptions[number];
export const sexualPreferenceOptions = [
  ["male" as const],
  ["female" as const],
  ["male" as const, "female" as const],
];
export type SexualPreference = typeof sexualPreferenceOptions[number];

export const genderFunctionalOptions = [
  "male" as const,
  "female" as const,
  "trans" as const,
];
export const genderAppearanceOptions = [
  "male" as const,
  "female" as const,
  "trans" as const,
  "non-binary" as const,
];
export type GenderFunctional = typeof genderFunctionalOptions[number];
export type GenderAppearance = typeof genderAppearanceOptions[number];

// export function genderFunctionalToAppearance(gFunc: GenderFunctional): GenderAppearance {
//   if (gFunc === "male" || )
// }
export function genderAppearanceToFunctional(gApp: GenderAppearance): GenderFunctional {
  if (gApp === "non-binary" || gApp === "trans") return "trans";
  if (gApp === "female" || gApp === "male") return gApp;
}
