import { userInfoFromMatchData } from "./match-data.model";
import { searchCriteriaFromDatabase } from "./search-criteria.model";

export interface generateSwipeStackRequest {
  searchCriteria: searchCriteriaFromDatabase;
}

export interface generateSwipeStackResponse {
  uids: string[];
}

export type getMatchDataUserInfoResponse = userInfoFromMatchData;

export interface getMatchDataUserInfoRequest {}
