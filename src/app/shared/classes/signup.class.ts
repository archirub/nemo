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
  UniversityName,
} from "@interfaces/index";

export class SignupDataHolder implements signupDataHolder {
  // email: string;
  // uid: string;
  // token: string;
  // tokenExpirationDate: string;
  firstName: string | null;
  dateOfBirth: Date | null;
  gender: Gender | null;
  sexualPreference: SexualPreference | null;
  degree: Degree | null;
  university: UniversityName | null;
  pictures: string[] | null;
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
    // email,
    // uid,
    // token,
    // tokenExpirationDate,
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
    console.log("inside data holder, sexPref is", sexualPreference);
    // this.email = email;
    // this.uid = uid;
    // this.token = token;
    // this.tokenExpirationDate = tokenExpirationDate;
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
  private _pictures: string[];
  private _university: UniversityName;
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

  public get pictures(): string[] {
    return this._pictures;
  }
  public set pictures(value: string[]) {
    this._pictures = value;
  }

  public get university(): UniversityName {
    return this._university;
  }
  public set university(value: UniversityName) {
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
