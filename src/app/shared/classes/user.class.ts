import { SexualPreference, Gender } from "./../interfaces/match-data.model";
import { Profile } from "./profile.class";
import {
  SocialMediaLink,
  QuestionAndAnswer,
  UniversityName,
  // OnCampus,
  appUser,
  Settings,
  Degree,
  Interests,
  searchCriteria,
  allowOptionalProp,
  AreaOfStudy,
  SocietyCategory,
  HasSeenTutorial,
} from "@interfaces/index";

export class AppUser extends Profile implements appUser {
  settings: Settings;
  latestSearchCriteria: allowOptionalProp<searchCriteria>;
  gender: Gender;
  sexualPreference: SexualPreference;
  hasSeenTutorial: HasSeenTutorial;

  // private _swipeMode: SwipeMode;

  constructor(
    uid: string,
    firstName: string,
    dateOfBirth: Date,
    pictureUrls: string[],
    pictureCount: number | null,
    biography: string,
    university: UniversityName,
    course: string,
    society: string,
    societyCategory: SocietyCategory,
    areaOfStudy: AreaOfStudy,
    interests: Interests[],
    questions: QuestionAndAnswer[],
    // onCampus: OnCampus,
    degree: Degree,
    socialMediaLinks: SocialMediaLink[],
    settings: Settings,
    latestSearchCriteria: allowOptionalProp<searchCriteria>,
    hasSeenTutorial: HasSeenTutorial,
    gender: Gender,
    sexualPreference: SexualPreference
    // swipeMode: SwipeMode
  ) {
    super(
      uid,
      firstName,
      dateOfBirth,
      pictureUrls,
      pictureCount,
      biography,
      university,
      course,
      society,
      societyCategory,
      areaOfStudy,
      interests,
      questions,
      // onCampus,
      degree,
      socialMediaLinks
    );
    this.areaOfStudy = areaOfStudy;
    this.societyCategory = societyCategory;
    this.settings = settings;
    this.latestSearchCriteria = latestSearchCriteria;
    this.gender = gender;
    this.sexualPreference = sexualPreference;
    this.hasSeenTutorial = hasSeenTutorial;
    // this.swipeMode = swipeMode;
  }
}
