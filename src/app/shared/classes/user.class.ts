import {
  SexualPreference,
  Gender,
  SwipeMode,
} from "./../interfaces/match-data.model";
import { Profile } from "./profile.class";
import {
  profilePictureUrls,
  SocialMediaLinks,
  QuestionAndAnswer,
  Interest,
  University,
  Location,
  user,
  Setting,
} from "@interfaces/index";
import { SearchCriteria } from "./search-criteria.class";

export class User extends Profile implements user {
  private _firstName: string;
  private _lastName: string;
  private _settings: Setting[];
  private _latestSearchCriteria: SearchCriteria;
  private _gender: Gender;
  private _sexualPreference: SexualPreference;
  private _swipeMode: SwipeMode;
  private _showProfile: Boolean;

  constructor(
    uid: string,
    displayName: string,
    dateOfBirth: Date,
    pictures: profilePictureUrls,
    biography: string,
    university: University,
    course: string,
    society: string,
    interests: Interest[],
    questions: QuestionAndAnswer[],
    location: Location,
    socialMediaLinks: SocialMediaLinks,
    firstName: string,
    lastName: string,
    settings: Setting[],
    latestSearchCriteria: SearchCriteria,
    gender: Gender,
    sexualPreference: SexualPreference,
    swipeMode: SwipeMode,
    showProfile: Boolean
  ) {
    super(
      uid,
      displayName,
      dateOfBirth,
      pictures,
      biography,
      university,
      course,
      society,
      interests,
      questions,
      location,
      socialMediaLinks
    );
    this.firstName = firstName;
    this.lastName = lastName;
    this.settings = settings;
    this.latestSearchCriteria = latestSearchCriteria;
    this.gender = gender;
    this.sexualPreference = sexualPreference;
    this.swipeMode = swipeMode;
    this.showProfile = showProfile;
  }

  public get firstName(): string {
    return this._firstName;
  }
  public set firstName(value: string) {
    this._firstName = value;
  }

  public get lastName(): string {
    return this._lastName;
  }
  public set lastName(value: string) {
    this._lastName = value;
  }

  public get latestSearchCriteria(): SearchCriteria {
    return this._latestSearchCriteria;
  }
  public set latestSearchCriteria(value: SearchCriteria) {
    this._latestSearchCriteria = value;
  }

  public get settings(): Setting[] {
    return this._settings;
  }
  public set settings(value: Setting[]) {
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

  public get showProfile(): Boolean {
    return this._showProfile;
  }
  public set showProfile(value: Boolean) {
    this._showProfile = value;
  }
}
