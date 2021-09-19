import {
  AreaOfStudy,
  SocietyCategory,
  Interests,
  searchCriteria,
  searchCriteriaOptions,
  UniversityName,
  // OnCampus,
  Degree,
  allowOptionalProp,
} from "@interfaces/index";

export class SearchCriteria implements allowOptionalProp<searchCriteria> {
  _university: UniversityName | null;
  _areaOfStudy: AreaOfStudy | null;
  _degree: Degree | null;
  _societyCategory: SocietyCategory | null;
  _interest: Interests | null;
  // _onCampus: OnCampus | null;

  options = searchCriteriaOptions;

  constructor({
    university = null,
    areaOfStudy = null,
    degree = null,
    societyCategory = null,
    interests = null,
  }: // onCampus = null,
  allowOptionalProp<searchCriteria>) {
    this.university = university;
    this.areaOfStudy = areaOfStudy;
    this.degree = degree;
    this.societyCategory = societyCategory;
    this.interests = interests;
    // this.onCampus = onCampus;
  }

  public set university(v: UniversityName | null) {
    this._university = v;
  }
  public get university(): UniversityName | null {
    return this._university;
  }

  public set areaOfStudy(v: AreaOfStudy | null) {
    this._areaOfStudy = v;
  }
  public get areaOfStudy(): AreaOfStudy | null {
    return this._areaOfStudy;
  }

  public set degree(v: Degree | null) {
    this._degree = v;
  }
  public get degree(): Degree | null {
    return this._degree;
  }

  public set societyCategory(v: SocietyCategory | null) {
    this._societyCategory = v;
  }
  public get societyCategory(): SocietyCategory | null {
    return this._societyCategory;
  }

  public set interests(v: Interests | null) {
    this._interest = v;
  }
  public get interests(): Interests | null {
    return this._interest;
  }

  // public set onCampus(v: OnCampus | null) {
  //   this._onCampus = v;
  // }
  // public get onCampus(): OnCampus | null {
  //   return this._onCampus;
  // }
}
