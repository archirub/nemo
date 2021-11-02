import { UniversityName } from "./universities.model";
import { Gender, SexualPreference } from "./match-data.model";
import { QuestionAndAnswer, SocialMediaLink } from "./profile.model";
import {
  AreaOfStudy,
  Degree,
  Interests,
  // OnCampus,
  SocietyCategory,
} from "./search-criteria.model";

export interface SignupAuthenticated {
  email: string;
  uid: string;
  token: string;
  tokenExpirationDate: string;
}

export interface SignupRequired {
  firstName: string;
  dateOfBirth: Date;
  gender: Gender;
  sexualPreference: SexualPreference;
  degree: Degree; // degree must be part of required for backend
  university: UniversityName;
  pictures: string[];
  // swipeMode: SwipeMode;
}

export interface SignupOptional {
  biography: string;
  course: string;
  society: string;
  areaOfStudy: AreaOfStudy;
  // onCampus: OnCampus;
  societyCategory: SocietyCategory;
  interests: Interests[];
  questions: QuestionAndAnswer[];
  socialMediaLinks: SocialMediaLink[];
}

export type SignupMap = SignupRequired & SignupOptional;

export type Baseline = SignupAuthenticated & SignupRequired;
export type Full = Baseline & SignupOptional;
