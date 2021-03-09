import { searchCriteriaOptions } from "@interfaces/index";
import { Gender, SexualPreference, SwipeMode } from "./match-data.model";
import { profilePictureUrls, QuestionAndAnswer } from "./profile.model";
import {
  AreaOfStudy,
  Degree,
  Interest,
  OnCampus,
  SocietyCategory,
} from "./search-criteria.model";

export interface Authenticated {
  email: string,
  uid: string;
  token: string;
  tokenExpirationDate: string;
}

export interface SignupRequired {
  firstName: string;
  dateOfBirth: string;
  gender: Gender;
  sexualPreference: SexualPreference;
  // university: typeof searchCriteriaOptions.university
  // swipeMode: SwipeMode;
  // pictures: profilePictureUrls;
}

export interface SignupOptional {
  biography: string;
  course: string;
  society: string;
  areaOfStudy: AreaOfStudy;
  onCampus: OnCampus;
  degree: Degree;
  societyCategory: SocietyCategory;
  interests: Interest[];
  questions: QuestionAndAnswer[];
}

export type SignupMap = SignupRequired & SignupOptional;

export type Baseline = Authenticated & SignupRequired;
export type Full = Baseline & SignupOptional;