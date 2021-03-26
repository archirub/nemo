import { Gender, SexualPreference, userInfoFromMatchData } from "./match-data.model";
import { searchCriteria, SearchFeatures } from "./search-criteria.model";
import { SignupOptional, SignupRequired } from "./signup.model";
import { swipeChoice, uidChoiceMap } from "./swipe-choice.model";

export interface generateSwipeStackRequest {
  searchCriteria: searchCriteria;
}
export interface generateSwipeStackResponse {
  users: uidChoiceMap[];
}

export interface getMatchDataUserInfoRequest {}
export type getMatchDataUserInfoResponse = userInfoFromMatchData;

export interface registerSwipeChoicesRequest {
  choices: uidChoiceMap[];
}
export interface registerSwipeChoicesResponse {}

export interface successResponse {
  successful: boolean;
}

export interface changeShowProfileRequest {
  showProfile: boolean;
}

export interface addOrRemoveReportedRequest {
  action: "add" | "remove";
  uid: string;
  reporteduid: string;
  description: string | null;
}

export interface updateSearchFeatureRequest {
  name: keyof SearchFeatures;
  value: SearchFeatures[keyof SearchFeatures];
}

export interface updateGenderSexPrefRequest {
  uid: string;
  name: "gender" | "sexualPreference";
  value: Gender | SexualPreference;
}

export type accountCreationRequest = SignupRequired & SignupOptional & { uid: string };
