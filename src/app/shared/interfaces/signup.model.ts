import { Gender, SexualPreference, SwipeMode } from "./match-data.model";
import { profilePictureUrls, QuestionAndAnswer } from "./profile.model";
import {
  AreaOfStudy,
  Interest,
  Location,
  SocietyCategory,
} from "./search-criteria.model";

export interface signupAuth {
  email: string;
  password: string;
}

export interface SignupRequired {
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  pictures: profilePictureUrls;
  university: string;
  gender: Gender;
  sexualPreference: SexualPreference;
  swipeMode: SwipeMode;
}

export interface SignupOptional {
  biography: string;
  course: string;
  society: string;
  areaOfStudy: AreaOfStudy;
  societyCategory: SocietyCategory;
  interests: Interest[];
  questions: QuestionAndAnswer[];
  location: Location;
}

export type SignupMap = SignupRequired & SignupOptional;
