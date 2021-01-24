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
