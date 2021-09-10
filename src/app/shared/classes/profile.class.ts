import {
  profile,
  profilePicturePaths,
  SocialMediaLink,
  QuestionAndAnswer,
  UniversityName,
  OnCampus,
  Degree,
  Interests,
  SocietyCategory,
  AreaOfStudy,
} from "@interfaces/index";

export class Profile implements profile {
  private _uid: string;
  private _firstName: string;
  private _dateOfBirth: Date;
  private _pictureCount: number;
  private _pictureUrls: string[];
  private _biography: string;
  private _university: UniversityName;
  private _course: string;
  private _society: string;
  private _societyCategory: SocietyCategory;
  private _areaOfStudy: AreaOfStudy;
  private _interests: Interests[];
  private _questions: QuestionAndAnswer[];
  private _onCampus: OnCampus;
  private _degree: Degree;
  private _socialMediaLinks: SocialMediaLink[];

  constructor(
    uid: string,
    firstName: string,
    dateOfBirth: Date,
    pictureCount: number,
    pictureUrls: string[],
    biography: string,
    university: UniversityName,
    course: string,
    society: string,
    societyCategory: SocietyCategory,
    areaOfStudy: AreaOfStudy,
    interests: Interests[],
    questions: QuestionAndAnswer[],
    onCampus: OnCampus,
    degree: Degree,
    socialMediaLinks: SocialMediaLink[]
  ) {
    this.uid = uid;
    this.firstName = firstName;
    this.dateOfBirth = dateOfBirth;
    this.pictureCount = pictureCount;
    this.pictureUrls = pictureUrls;
    this.biography = biography;
    this.university = university;
    this.course = course;
    this.society = society;
    this.societyCategory = societyCategory;
    this.areaOfStudy = areaOfStudy;
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

  public get pictureCount(): number {
    return this._pictureCount;
  }
  public set pictureCount(value: number) {
    this._pictureCount = value;
  }
  public get pictureUrls(): string[] {
    return this._pictureUrls;
  }
  public set pictureUrls(value: string[]) {
    this._pictureUrls = value;
  }

  public get biography(): string {
    return this._biography;
  }
  public set biography(value: string) {
    this._biography = value;
  }

  public get university(): UniversityName {
    return this._university;
  }
  public set university(value: UniversityName) {
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

  public get societyCategory(): SocietyCategory {
    return this._societyCategory;
  }
  public set societyCategory(value: SocietyCategory) {
    this._societyCategory = value;
  }

  public get areaOfStudy(): AreaOfStudy {
    return this._areaOfStudy;
  }
  public set areaOfStudy(value: AreaOfStudy) {
    this._areaOfStudy = value;
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
}
