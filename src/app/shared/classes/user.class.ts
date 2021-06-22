import { SexualPreference, Gender, SwipeMode } from "./../interfaces/match-data.model";
import { Profile } from "./profile.class";
import {
  SocialMediaLink,
  QuestionAndAnswer,
  University,
  OnCampus,
  user,
  Settings,
  Degree,
  Interests,
} from "@interfaces/index";
import { SearchCriteria } from "./search-criteria.class";

export class User extends Profile implements user {
  private _settings: Settings;
  private _latestSearchCriteria: SearchCriteria;
  private _gender: Gender;
  private _sexualPreference: SexualPreference;
  private _swipeMode: SwipeMode;
  private _token: string;
  private _tokenExpirationDate: Date;

  constructor(
    uid: string,
    firstName: string,
    dateOfBirth: Date,
    pictureCount: number,
    pictureUrls: string[],
    biography: string,
    university: University,
    course: string,
    society: string,
    interests: Interests[],
    questions: QuestionAndAnswer[],
    onCampus: OnCampus,
    degree: Degree,
    socialMediaLinks: SocialMediaLink[],
    settings: Settings,
    latestSearchCriteria: SearchCriteria,
    gender: Gender,
    sexualPreference: SexualPreference,
    swipeMode: SwipeMode
  ) {
    super(
      uid,
      firstName,
      dateOfBirth,
      pictureCount,
      pictureUrls,
      biography,
      university,
      course,
      society,
      interests,
      questions,
      onCampus,
      degree,
      socialMediaLinks
    );
    this.settings = settings;
    this.latestSearchCriteria = latestSearchCriteria;
    this.gender = gender;
    this.sexualPreference = sexualPreference;
    this.swipeMode = swipeMode;
  }

  public get latestSearchCriteria(): SearchCriteria {
    return this._latestSearchCriteria;
  }
  public set latestSearchCriteria(value: SearchCriteria) {
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

  public get swipeMode(): SwipeMode {
    return this._swipeMode;
  }
  public set swipeMode(value: SwipeMode) {
    this._swipeMode = value;
  }
}
