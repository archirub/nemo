import { searchCriteriaOptions } from "@interfaces/index";
import { Gender, SexualPreference, SwipeMode } from "./match-data.model";
import { photoObject, profilePicturePaths, QuestionAndAnswer } from "./profile.model";
import {
  AreaOfStudy,
  Degree,
  Interest,
  OnCampus,
  SocietyCategory,
  University,
} from "./search-criteria.model";

export interface SignupAuthenticated {
  email: string;
  uid: string;
  token: string;
  tokenExpirationDate: string;
}

export interface SignupRequired {
  firstName: string;
  dateOfBirth: string;
  gender: Gender;
  sexualPreference: SexualPreference;
  degree: Degree; // degree must be part of required for backend
  university: University;
  pictures: photoObject[];
  // swipeMode: SwipeMode;
}

export interface SignupOptional {
  biography: string;
  course: string;
  society: string;
  areaOfStudy: AreaOfStudy;
  onCampus: OnCampus;
  societyCategory: SocietyCategory;
  interests: Interest[];
  questions: QuestionAndAnswer[];
}

export type SignupMap = SignupRequired & SignupOptional;

export type Baseline = SignupAuthenticated & SignupRequired;
export type Full = Baseline & SignupOptional;
