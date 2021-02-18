import { userInfoFromMatchData } from "./match-data.model";
import { searchCriteriaFromDatabase } from "./search-criteria.model";
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

export interface changeShowProfileRequest {
  showProfile: Boolean;
}
export interface changeShowProfileResponse {
  successful: Boolean;
}
