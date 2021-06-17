import {
  profile,
  profilePicturePaths,
  SocialMediaLink,
  QuestionAndAnswer,
  University,
  OnCampus,
  Degree,
  Interests,
} from "@interfaces/index";

export class Profile implements profile {
  private _uid: string;
  private _firstName: string;
  private _dateOfBirth: Date;
  // private _pictures: profilePicturePaths;
  private _biography: string;
  private _university: University;
  private _course: string;
  private _society: string;
  private _interests: Interests[];
  private _questions: QuestionAndAnswer[];
  private _onCampus: OnCampus;
  private _degree: Degree;
  private _socialMediaLinks: SocialMediaLink[];

  constructor(
    uid: string,
    firstName: string,
    dateOfBirth: Date,
    // pictures: profilePicturePaths,
    biography: string,
    university: University,
    course: string,
    society: string,
    interests: Interests[],
    questions: QuestionAndAnswer[],
    onCampus: OnCampus,
    degree: Degree,
    socialMediaLinks: SocialMediaLink[]
  ) {
    this.uid = uid;
    this.firstName = firstName;
    this.dateOfBirth = dateOfBirth;
    // this.pictures = pictures;
    this.biography = biography;
    this.university = university;
    this.course = course;
    this.society = society;
    this.interests = interests;
    this.questions = questions;
    this.onCampus = onCampus;
    this.degree = degree;
    this.socialMediaLinks = socialMediaLinks;
  }

  public get uid(): string {
    return this._uid;
  }
  public set uid(value: string) {
    this._uid = value;
  }

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

  // public get pictures(): profilePicturePaths {
  //   return this._pictures;
  // }
  // public set pictures(value: profilePicturePaths) {
  //   this._pictures = value;
  // }

  public get biography(): string {
    return this._biography;
  }
  public set biography(value: string) {
    this._biography = value;
  }

  public get university(): University {
    return this._university;
  }
  public set university(value: University) {
    this._university = value;
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

  public get onCampus(): OnCampus {
    return this._onCampus;
  }
  public set onCampus(value: OnCampus) {
    this._onCampus = value;
  }

  public get degree(): Degree {
    return this._degree;
  }
  public set degree(value: Degree) {
    this._degree = value;
  }

  public get socialMediaLinks(): SocialMediaLink[] {
    return this._socialMediaLinks;
  }
  public set socialMediaLinks(value: SocialMediaLink[]) {
    this._socialMediaLinks = value;
  }

  age() {
    const currentTime = new Date();
    return Math.trunc(
      (currentTime.getTime() - this.dateOfBirth.getTime()) / (1000 * 3600 * 24 * 365)
    );
  }

  degrees = { undergrad: "UG", postgrad: "PG" };

  shortDegree() {
    let ret = "";
    if (this.degree) {
      ret = this.degrees[this.degree];
    }
    return ret;
  }
}
