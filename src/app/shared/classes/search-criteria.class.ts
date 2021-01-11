import {
  Location,
  AgeRange,
  AreaOfStudy,
  SocietyCategory,
  Interest,
  SCriteria,
  searchCriteriaOptions,
  University,
} from "@interfaces/index";

export class SearchCriteria implements SCriteria {
  _university: University;
  _areaOfStudy: AreaOfStudy;
  _ageRange: AgeRange;
  _societyCategory: SocietyCategory;
  _interest: Interest;
  _location: Location;

  options = searchCriteriaOptions;

  constructor(
    university: University,
    areaOfStudy: AreaOfStudy,
    ageRange: AgeRange,
    societyCategory: SocietyCategory,
    interest: Interest,
    location: Location
  ) {
    this.university = university;
    this.areaOfStudy = areaOfStudy;
    this.ageRange = ageRange;
    this.societyCategory = societyCategory;
    this.interest = interest;
    this.location = location;
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

  public set ageRange(v: AgeRange) {
    if (this.options.ageRange.includes(v)) {
      this._ageRange = v;
    }
  }
  public get ageRange(): AgeRange {
    return this._ageRange;
  }

  public set societyCategory(v: SocietyCategory) {
    if (this.options.societyCategory.includes(v)) {
      this._societyCategory = v;
    }
  }
  public get societyCategory(): SocietyCategory {
    return this._societyCategory;
  }

  public set interest(v: Interest) {
    if (this.options.interest.includes(v)) {
      this._interest = v;
    }
  }
  public get interest(): Interest {
    return this._interest;
  }

  public set location(v: Location) {
    if (this.options.location.includes(v)) {
      this._location = v;
    }
  }
  public get location(): Location {
    return this._location;
  }
}
