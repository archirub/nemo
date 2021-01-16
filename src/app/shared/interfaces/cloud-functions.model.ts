import { swipeOutcome, userInfoFromMatchData } from "./match-data.model";
import { searchCriteriaFromDatabase } from "./search-criteria.model";

export interface generateSwipeStackRequest {
  searchCriteria: searchCriteriaFromDatabase;
}
export interface generateSwipeStackResponse {
  uids: string[];
}

export interface getMatchDataUserInfoRequest {}

export type getMatchDataUserInfoResponse = userInfoFromMatchData;

export type swipeChoiceObjectDatabase = { uid: string; choice: swipeOutcome };
export interface registerSwipeChoicesRequest {
  choices: swipeChoiceObjectDatabase[];
}
export interface registerSwipeChoicesResponse {}
