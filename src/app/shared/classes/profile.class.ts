import {
  profile,
  profilePictureUrls,
  SocialMediaLink,
  QuestionAndAnswer,
  Interest,
  University,
  Location,
} from "@interfaces/index";

export class Profile implements profile {
  private _uid: string;
  private _displayName: string;
  private _dateOfBirth: Date;
  private _pictures: profilePictureUrls;
  private _biography: string;
  private _university: University;
  private _course: string;
  private _society: string;
  private _interests: Interest[];
  private _questions: QuestionAndAnswer[];
  private _location: Location;
  private _socialMediaLinks: SocialMediaLink[];

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
    socialMediaLinks: SocialMediaLink[]
  ) {
    this.uid = uid;
    this.displayName = displayName;
    this.dateOfBirth = dateOfBirth;
    this.pictures = pictures;
    this.biography = biography;
    this.university = university;
    this.course = course;
    this.society = society;
    this.interests = interests;
    this.questions = questions;
    this.location = location;
    this.socialMediaLinks = socialMediaLinks;
  }

  public get uid(): string {
    return this._uid;
  }
  public set uid(value: string) {
    this._uid = value;
  }

  public get displayName(): string {
    return this._displayName;
  }
  public set displayName(value: string) {
    this._displayName = value;
  }

  public get dateOfBirth(): Date {
    return this._dateOfBirth;
  }
  public set dateOfBirth(value: Date) {
    this._dateOfBirth = value;
  }

  public get pictures(): profilePictureUrls {
    return this._pictures;
  }
  public set pictures(value: profilePictureUrls) {
    this._pictures = value;
  }

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

  public get interests(): Interest[] {
    return this._interests;
  }
  public set interests(value: Interest[]) {
    this._interests = value;
  }

  public get questions(): QuestionAndAnswer[] {
    return this._questions;
  }
  public set questions(value: QuestionAndAnswer[]) {
    this._questions = value;
  }

  public get location(): Location {
    return this._location;
  }
  public set location(value: Location) {
    this._location = value;
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
      (currentTime.getTime() - this.dateOfBirth.getTime()) /
        (1000 * 3600 * 24 * 365)
    );
  }
}
