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
  university: UniversityName | null;
  areaOfStudy: AreaOfStudy | null;
  degree: Degree | null;
  societyCategory: SocietyCategory | null;
  interests: Interests | null;
  // onCampus: OnCampus | null;

  constructor({
    university = null,
    areaOfStudy = null,
    degree = null,
    societyCategory = null,
    interests = null,
  }: allowOptionalProp<searchCriteria>) {
    this.university = university;
    this.areaOfStudy = areaOfStudy;
    this.degree = degree;
    this.societyCategory = societyCategory;
    this.interests = interests;
    // this.onCampus = onCampus;
  }
}
