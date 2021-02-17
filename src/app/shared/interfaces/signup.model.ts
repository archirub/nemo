import { Gender, SexualPreference, SwipeMode } from "./match-data.model";
import { profilePictureUrls, QuestionAndAnswer } from "./profile.model";
import {
  AreaOfStudy,
  Degree,
  Interest,
  OnCampus,
  SocietyCategory,
} from "./search-criteria.model";

export interface SignupAuth {
  email: string,
  uid: string;
  token: string;
  tokenExpirationDate: string;
}

export interface SignupRequired {
  firstName: string;
  dateOfBirth: string;
  university: string;
  gender: Gender;
  sexualPreference: SexualPreference;
  swipeMode: SwipeMode;
  // pictures: profilePictureUrls;
}

export interface SignupOptional {
  biography: string;
  course: string;
  society: string;
  areaOfStudy: AreaOfStudy;
  degree: Degree;
  societyCategory: SocietyCategory;
  interests: Interest[];
  questions: QuestionAndAnswer[];
  onCampus: OnCampus;
}

export type SignupMap = SignupRequired & SignupOptional;

export type Baseline = SignupAuth & SignupRequired;
export type Full = Baseline & SignupOptional;