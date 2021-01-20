import { SearchFeatures } from "./search-criteria.model";

export interface matchDataFromDatabase {
  PI: number;

  matchedUsers: string[];
  likedUsers: string[];
  dislikedUsers: string[];
  superLikedUsers: string[];
  reportedUsers: string[];

  gender: Gender;
  sexualPreference: SexualPreference;
  swipeMode: SwipeMode;
  searchFeatures: SearchFeatures;

  showProfile: Boolean;
}

export interface userInfoFromMatchData {
  gender: Gender;
  sexualPreference: SexualPreference;
  swipeMode: SwipeMode;
  showProfile: Boolean;
}

export const genderOptions = ["male", "female", "non-binary"] as const;
export type Gender = typeof genderOptions[number];
export type SexualPreference = Gender[];

export const swipeModeOptions = ["friend", "dating", "both"] as const;
export type SwipeMode = typeof swipeModeOptions[number];
