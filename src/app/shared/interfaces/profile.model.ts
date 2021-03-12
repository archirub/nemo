import {
  InterestAndPath,
  SocietyCategory,
  University,
  searchCriteriaFromDatabase,
  OnCampus,
  Degree,
} from "./search-criteria.model";

// FOR CLOUD FUNCTION DEPLOYMENT, otherwise it doesn't recognize the type declaration below
import * as firebase from "firebase";

export interface profile {
  uid: string;
  firstName: string;
  dateOfBirth: Date;
  pictures: profilePictureUrls;
  biography: string;
  university: University;
  degree: Degree;
  course: string;
  society: string;
  interests: InterestAndPath[];
  questions: QuestionAndAnswer[];
  onCampus: OnCampus;
  socialMediaLinks: SocialMediaLink[];
}

export interface user extends profile {
  // firstName: string;
  // lastName: string;
  settings: Settings;
  latestSearchCriteria: searchCriteriaFromDatabase;
}

export interface profileFromDatabase {
  firstName: string;
  dateOfBirth: firebase.firestore.Timestamp;
  pictures: profilePictureUrls;
  biography: string;

  university: University;
  degree: Degree;
  // areaOfStudy: AreaOfStudy;
  course: string;
  society: string; // SOCIETIES???

  // societyCategory: SocietyCategory;
  interest: InterestAndPath[]; // This needs to be changed in the database
  questions: QuestionAndAnswer[];
  onCampus: OnCampus;

  socialMediaLinks: SocialMediaLink[];

  // hasMatchDocument: boolean; // TEMPORARY Helps in match-generator to find profiles with no match document
}

export interface privateProfileFromDatabase {
  // firstName: string;
  // lastName: string;
  settings: Settings;
  latestSearchCriteria: searchCriteriaFromDatabase;
}

// TO DEFINE BUT SHOWPROFILE MUST BE IN THERE
const settingNameOption = ["showProfile"] as const;
export type settingName = typeof settingNameOption[number];
export type Settings = { [settingName: string]: any };

export const questionsOptions = [
  "The best place for coffee is",
  "The best place to study is",
  "I have a fetish for",
  "When Covid is over, I will",
  "On Sports Night I would usually",
  "Netflix n Chill is",
  "After school, you can find me",
  "During seminars, I",
  "If I were Provost,",
  "During Covid, I have",
  "At 9am you can find me",
  "Society needs to change",
  "I am scared of",
  "A dm on insta is",
  "A goal of mine is to",
  "The perfect first date would involve",
  "I think sharking is",
  "My dream job is",
  "I speak",
  "Talking loudly in the library is",
  "When no-one is looking, I",
  "My professor would say that I’m",
  "Tinder sucks because",
  "The soundtrack of my life is",
  "My favourite quality in someone is",
] as const;
export type Question = typeof questionsOptions[number];
export type QuestionAndAnswer = { question: Question; answer: string };

const socialMediaOptions = ["facebook", "instagram"] as const;
export type socialMedia = typeof socialMediaOptions[number];
export type SocialMediaLink = { socialMedia: socialMedia; link: string };

// export interface socialFeatures {
//   university: string;
//   course: string;
//   societies: SocietyCategory;
// }

// users must have between 1 and 5 pictures
export type profilePictureUrls = [string?, string?, string?, string?, string?];

export interface profileObject {
  ID: string;
  profileSnapshot: profileSnapshot;
}

export type profileSnapshot = firebase.firestore.QueryDocumentSnapshot<firebase.firestore.DocumentData>;
