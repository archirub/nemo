import {
  SocietyCategory,
  University,
  searchCriteria,
  OnCampus,
  Degree,
  Interests,
  AreaOfStudy,
} from "./search-criteria.model";

// FOR CLOUD FUNCTION DEPLOYMENT, otherwise it doesn't recognize the type declaration below
import * as firebase from "firebase";
import { CameraPhoto } from "@capacitor/core";
import { allowOptionalProp } from "./shared.model";
import { Gender, SexualPreference, SwipeMode } from "./match-data.model";

export const MAX_PROFILE_PICTURES_COUNT = 6;
export const MAX_PROFILE_QUESTIONS_COUNT = 3;

export interface profile {
  uid: string;
  firstName: string;
  dateOfBirth: Date;
  pictureCount: number;
  pictureUrls: string[];
  biography: string;
  university: University;
  degree: Degree;
  course: string;
  societyCategory: SocietyCategory;
  areaOfStudy: AreaOfStudy;
  society: string;
  interests: Interests[];
  questions: QuestionAndAnswer[];
  onCampus: OnCampus;
  socialMediaLinks: SocialMediaLink[];
}

export interface editableProfileFields {
  biography: string | null;
  course: string | null;
  areaOfStudy: AreaOfStudy | null;
  society: string | null;
  societyCategory: SocietyCategory | null;
  interests: Interests[] | null;
  questions: QuestionAndAnswer[] | null;
}

export interface user extends profile {
  societyCategory: SocietyCategory;
  areaOfStudy: AreaOfStudy;
  sexualPreference: SexualPreference;
  gender: Gender;
  // swipeMode: SwipeMode;
  settings: Settings;
  latestSearchCriteria: allowOptionalProp<searchCriteria>;
}

export interface profileFromDatabase {
  firstName: string;
  dateOfBirth: firebase.firestore.Timestamp;
  pictureCount: number;
  biography: string;

  university: University;
  degree: Degree;
  course: string;
  society: string;
  societyCategory: SocietyCategory;
  areaOfStudy: AreaOfStudy;

  interests: Interests[]; // This needs to be changed in the database
  questions: QuestionAndAnswer[];
  onCampus: OnCampus;

  socialMediaLinks: SocialMediaLink[];
}

export interface privateProfileFromDatabase {
  settings: Settings;
  latestSearchCriteria: allowOptionalProp<searchCriteria>;
}

// TO DEFINE BUT SHOWPROFILE MUST BE IN THERE
const settingNameOption = ["showProfile"] as const;
export type settingName = typeof settingNameOption[number];
export type Settings = { [settingName: string]: any };

export const questionsOptions = [
  "The best place for coffee is" as const,
  "The best place to study is" as const,
  "I have a fetish for" as const,
  "When Covid is over, I will" as const,
  "On Sports Night I would usually" as const,
  "Netflix n Chill is" as const,
  "After school, you can find me" as const,
  "During seminars, I" as const,
  "If I were Provost, I" as const,
  "During Covid, I have" as const,
  "At 9am you can find me" as const,
  "Society needs to change" as const,
  "I am scared of" as const,
  "A dm on insta is" as const,
  "A goal of mine is to" as const,
  "The perfect first date would involve" as const,
  "I think sharking is" as const,
  "My dream job is" as const,
  "I speak" as const,
  "Talking loudly in the library is" as const,
  "When no-one is looking, I" as const,
  "My professor would say that I’m" as const,
  "Tinder sucks because" as const,
  "The soundtrack of my life is" as const,
  "My favourite quality in someone is" as const,
];
export type Question = typeof questionsOptions[number];
export type QuestionAndAnswer = { question: Question; answer: string };

export const socialMediaOptions = ["facebook" as const, "instagram" as const];
export type socialMedia = typeof socialMediaOptions[number];
export type SocialMediaLink = { socialMedia: socialMedia; link: string };

// export interface socialFeatures {
//   university: string;
//   course: string;
//   societies: SocietyCategory;
// }

// users must have between 1 and 5 pictures
export type profilePicturePaths = [
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?,
  string?
];

export interface profileObject {
  ID: string;
  profileSnapshot: profileSnapshot;
}

export type profileSnapshot =
  firebase.firestore.QueryDocumentSnapshot<firebase.firestore.DocumentData>;
