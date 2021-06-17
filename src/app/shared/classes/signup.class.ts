import { CameraPhoto } from "@capacitor/core";
import { signupDataHolder } from "@interfaces/auth-response.model";
import {
  AreaOfStudy,
  Baseline,
  Degree,
  Full,
  Gender,
  Interests,
  profilePicturePaths,
  QuestionAndAnswer,
  SexualPreference,
  SignupAuthenticated,
  SignupOptional,
  SignupRequired,
  SocialMediaLink,
  SocietyCategory,
  SwipeMode,
  University,
} from "@interfaces/index";

export class SignupDataHolder implements signupDataHolder {
  email: string;
  uid: string;
  token: string;
  tokenExpirationDate: string;
  firstName: string | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
  sexualPreference: SexualPreference | null;
  degree: Degree | null;
  university: University | null;
  pictures: CameraPhoto[] | null;
  biography: string | null;
  course: string | null;
  society: string | null;
  areaOfStudy: AreaOfStudy | null;
  onCampus: boolean | null;
  societyCategory: SocietyCategory | null;
  interests: Interests[] | null;
  questions: QuestionAndAnswer[] | null;
  socialMediaLinks: SocialMediaLink[] | null;

  constructor({
    email,
    uid,
    token,
    tokenExpirationDate,
    firstName = null,
    dateOfBirth = null,
    gender = null,
    sexualPreference = null,
    degree = null,
    university = null,
    pictures = null,
    biography = null,
    course = null,
    society = null,
    areaOfStudy = null,
    onCampus = null,
    societyCategory = null,
    interests = null,
    questions = null,
    socialMediaLinks = null,
  }) {
    this.email = email;
    this.uid = uid;
    this.token = token;
    this.tokenExpirationDate = tokenExpirationDate;
    this.firstName = firstName;
    this.dateOfBirth = dateOfBirth;
    this.gender = gender;
    this.sexualPreference = sexualPreference;
    this.degree = degree;
    this.university = university;
    this.pictures = pictures;
    this.biography = biography;
    this.course = course;
    this.society = society;
    this.areaOfStudy = areaOfStudy;
    this.onCampus = onCampus;
    this.societyCategory = societyCategory;
    this.interests = interests;
    this.questions = questions;
    this.socialMediaLinks = socialMediaLinks;
  }
}

export class AuthenticatedUser implements SignupAuthenticated {
  constructor(myMap: SignupAuthenticated) {
    this.email = myMap.email;
    this.uid = myMap.uid;
    this.token = myMap.token;
    this.tokenExpirationDate = myMap.tokenExpirationDate;
  }
  private _email: string;
  private _uid: string;
  private _token: string;
  private _tokenExpirationDate: string;

  public get email(): string {
    return this._email;
  }
  public set email(value: string) {
    this._email = value;
  }
  public get uid(): string {
    return this._uid;
  }
  public set uid(value: string) {
    this._uid = value;
  }
  public get token(): string {
    return this._token;
  }
  public set token(value: string) {
    this._token = value;
  }
  public get tokenExpirationDate(): string {
    return this._tokenExpirationDate;
  }
  public set tokenExpirationDate(value: string) {
    this._tokenExpirationDate = value;
  }
}

export class BaselineUser extends AuthenticatedUser implements SignupRequired {
  constructor(myMap: Baseline) {
    super(myMap);
    this.firstName = myMap.firstName;
    this.dateOfBirth = myMap.dateOfBirth;
    this.gender = myMap.gender;
    this.sexualPreference = myMap.sexualPreference;
    this.pictures = myMap.pictures;
    this.university = myMap.university;
    this.degree = myMap.degree;
    // this.swipeMode = myMap.swipeMode
  }
  private _firstName: string;
  private _dateOfBirth: Date;
  private _gender: Gender;
  private _sexualPreference: SexualPreference;
  private _pictures: CameraPhoto[];
  private _university: University;
  private _degree: Degree;
  //   private _swipeMode: SwipeMode;

  public get firstName(): string {
    return this._firstName;
  }
  public set firstName(value: string) {
    this._firstName = value;
  }

  public get dateOfBirth(): Date {
    return this._dateOfBirth;
  }
  public set dateOfBirth(value: Date) {
    this._dateOfBirth = value;
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

  public get pictures(): CameraPhoto[] {
    return this._pictures;
  }
  public set pictures(value: CameraPhoto[]) {
    this._pictures = value;
  }

  public get university(): University {
    return this._university;
  }
  public set university(value: University) {
    this._university = value;
  }

  public get degree(): Degree {
    return this._degree;
  }
  public set degree(value: Degree) {
    this._degree = value;
  }

  //   public get swipeMode(): SwipeMode {
  //     return this._swipeMode;
  //   }
  //   public set swipeMode(value: SwipeMode) {
  //     this._swipeMode = value;
  //   }
}

export class FullUser extends BaselineUser implements SignupOptional {
  constructor(m: Full) {
    super(m);
    this.biography = m.biography;
    this.course = m.course;
    this.society = m.society;
    this.areaOfStudy = m.areaOfStudy;
    this.societyCategory = m.societyCategory;
    this.interests = m.interests;
    this.questions = m.questions;
    this.onCampus = m.onCampus;
    this.socialMediaLinks = m.socialMediaLinks;
  }
  private _biography: string;
  private _course: string;
  private _society: string;
  private _areaOfStudy: AreaOfStudy;
  private _societyCategory: SocietyCategory;
  private _interests: Interests[];
  private _questions: QuestionAndAnswer[];
  private _onCampus: boolean;
  private _socialMediaLinks: SocialMediaLink[];

  public get biography(): string {
    return this._biography;
  }
  public set biography(value: string) {
    this._biography = value;
  }
  public get course(): string {
    return this._course;
  }
  public set course(value: string) {
    this._course = value;
  }
  public get society(): string {
    return this._society;
  }
  public set society(value: string) {
    this._society = value;
  }
  public get areaOfStudy(): AreaOfStudy {
    return this._areaOfStudy;
  }
  public set areaOfStudy(value: AreaOfStudy) {
    this._areaOfStudy = value;
  }

  public get societyCategory(): SocietyCategory {
    return this._societyCategory;
  }
  public set societyCategory(value: SocietyCategory) {
    this._societyCategory = value;
  }
  public get interests(): Interests[] {
    return this._interests;
  }
  public set interests(value: Interests[]) {
    this._interests = value;
  }
  public get questions(): QuestionAndAnswer[] {
    return this._questions;
  }
  public set questions(value: QuestionAndAnswer[]) {
    this._questions = value;
  }
  public get onCampus(): boolean {
    return this._onCampus;
  }
  public set onCampus(value: boolean) {
    this._onCampus = value;
  }

  public get socialMediaLinks(): SocialMediaLink[] {
    return this._socialMediaLinks;
  }
  public set socialMediaLinks(value: SocialMediaLink[]) {
    this._socialMediaLinks = value;
  }
}
