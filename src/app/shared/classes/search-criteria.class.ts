import {
  AreaOfStudy,
  SocietyCategory,
  Interests,
  searchCriteria,
  searchCriteriaOptions,
  University,
  OnCampus,
  Degree,
} from "@interfaces/index";

export class SearchCriteria implements searchCriteria {
  _university: University;
  _areaOfStudy: AreaOfStudy;
  _degree: Degree;
  _societyCategory: SocietyCategory;
  _interest: Interests;
  _onCampus: OnCampus;

  options = searchCriteriaOptions;

  constructor(
    university: University,
    areaOfStudy: AreaOfStudy,
    degree: Degree,
    societyCategory: SocietyCategory,
    interests: Interests,
    onCampus: OnCampus
  ) {
    this.university = university;
    this.areaOfStudy = areaOfStudy;
    this.degree = degree;
    this.societyCategory = societyCategory;
    this.interests = interests;
    this.onCampus = onCampus;
  }

  public set university(v: University) {
    if (this.options.university.includes(v)) {
      this._university = v;
    } else {
      console.error();
    }
  }
  public get university(): University {
    return this._university;
  }

  public set areaOfStudy(v: AreaOfStudy) {
    if (this.options.areaOfStudy.includes(v)) {
      this._areaOfStudy = v;
    }
  }
  public get areaOfStudy(): AreaOfStudy {
    return this._areaOfStudy;
  }

  public set degree(v: Degree) {
    if (this.options.degree.includes(v)) {
      this._degree = v;
    }
  }
  public get degree(): Degree {
    return this._degree;
  }

  public set societyCategory(v: SocietyCategory) {
    if (this.options.societyCategory.includes(v)) {
      this._societyCategory = v;
    }
  }
  public get societyCategory(): SocietyCategory {
    return this._societyCategory;
  }

  public set interests(v: Interests) {
    if (this.options.interests.includes(v)) {
      this._interest = v;
    }
  }
  public get interests(): Interests {
    return this._interest;
  }

  public set onCampus(v: OnCampus) {
    if (this.options.onCampus.includes(v)) {
      this._onCampus = v;
    }
  }
  public get onCampus(): OnCampus {
    return this._onCampus;
  }
}
