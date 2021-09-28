import {
  Gender,
  SexualPreference,
  userInfoFromMatchData,
  userInfoFromPickingData,
} from "./match-data.model";
import { editableProfileFields } from "./profile.model";
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

export interface getPickingDataUserInfoRequest {}
export type getPickingDataUserInfoResponse = userInfoFromPickingData;

export interface registerSwipeChoicesRequest {
  choices: uidChoiceMap[];
}
export interface registerSwipeChoicesResponse {}

export interface successResponse {
  successful: boolean;
  message?: string;
}

export interface changeShowProfileRequest {
  showProfile: boolean;
}

export interface addOrRemoveReportedRequest {
  action: "add" | "remove";
  reporteduid: string;
}

export interface updateSearchFeaturesRequest {
  features: {
    name: keyof SearchFeatures;
    value: SearchFeatures[keyof SearchFeatures];
  }[];
}

export interface updateGenderSexPrefRequest {
  name: "gender" | "sexualPreference";
  value: Gender | SexualPreference;
}

export type createAccountRequest = Omit<SignupRequired, "pictures" | "dateOfBirth"> &
  SignupOptional & { dateOfBirth: string };

export type profileEditingByUserRequest = {
  data: editableProfileFields;
};

export type deleteAccountRequest = {};

export type chatDeletionByUserRequest = { chatID: string };

export type checkEmailValidityRequest = { email: string };
