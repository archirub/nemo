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
  private _settings: Settings;
  private _latestSearchCriteria: allowOptionalProp<searchCriteria>;
  private _gender: Gender;
  private _sexualPreference: SexualPreference;
  private _hasSeenTutorial: HasSeenTutorial;

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

  public get hasSeenTutorial(): HasSeenTutorial {
    return this._hasSeenTutorial;
  }
  public set hasSeenTutorial(value: HasSeenTutorial) {
    this._hasSeenTutorial = value;
  }

  public get latestSearchCriteria(): allowOptionalProp<searchCriteria> {
    return this._latestSearchCriteria;
  }
  public set latestSearchCriteria(value: allowOptionalProp<searchCriteria>) {
    this._latestSearchCriteria = value;
  }

  public get settings(): Settings {
    return this._settings;
  }
  public set settings(value: Settings) {
    this._settings = value;
  }

  public get gender(): Gender {
    return this._gender;
  }
  public set gender(value: Gender) {
    this._gender = value;
  }

  public get sexualPreference(): SexualPreference {
    return this._sexualPreference;
  }
  public set sexualPreference(value: SexualPreference) {
    this._sexualPreference = value;
  }

  // public get swipeMode(): SwipeMode {
  //   return this._swipeMode;
  // }
  // public set swipeMode(value: SwipeMode) {
  //   this._swipeMode = value;
  // }
}
