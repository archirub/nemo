import {
  IDarray,
  profile,
  socialFeatures,
  userPictures,
} from "@interfaces/index";

export class Profile implements profile {
  private _firstName: string;
  private _lastName: string;
  private _dateOfBirth: Date;
  private _pictures: userPictures;
  private _biography: string;
  private _socialFeatures: socialFeatures;
  private _matches: IDarray;

  constructor(
    firstName: string,
    lastName: string,
    dateOfBirth: Date,
    pictures: userPictures,
    biography: string,
    socialFeatures: socialFeatures,
    matches: IDarray
  ) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.dateOfBirth = dateOfBirth;
    this.pictures = pictures;
    this._biography = biography;
    this.socialFeatures = socialFeatures;
    this.matches = matches;
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

  public get dateOfBirth(): Date {
    return this._dateOfBirth;
  }
  public set dateOfBirth(value: Date) {
    this._dateOfBirth = value;
  }

  public get pictures(): userPictures {
    return this._pictures;
  }
  public set pictures(value: userPictures) {
    this._pictures = value;
  }

  public get biography(): string {
    return this._biography;
  }
  public set biography(value: string) {
    this._biography = value;
  }

  public get socialFeatures(): socialFeatures {
    return this._socialFeatures;
  }
  public set socialFeatures(value: socialFeatures) {
    this._socialFeatures = value;
  }

  public get matches(): IDarray {
    return this._matches;
  }
  public set matches(value: IDarray) {
    this._matches = value;
  }

  age() {
    const currentTime = new Date();
    return Math.trunc(
      (currentTime.getTime() - this.dateOfBirth.getTime()) /
        (1000 * 3600 * 24 * 365)
    );
  }
}
