import { Gender, SexualPreference, userInfoFromMatchData } from "./match-data.model";
import { searchCriteriaFromDatabase, SearchFeatures } from "./search-criteria.model";
import { swipeChoice, uidChoiceMap } from "./swipe-choice.model";

export interface generateSwipeStackRequest {
  searchCriteria: searchCriteriaFromDatabase;
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
  successful: Boolean;
}

export interface changeShowProfileRequest {
  showProfile: Boolean;
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
