export interface SCriteria {
  university?: University; // select
  areaOfStudy?: AreaOfStudy; // select
  ageRange?: AgeRange; // slider
  societyCategory?: SocietyCategory; // select
  interest?: Interest; // select
  location?: Location; // radio button
}

export type University = "UCL";
export type AreaOfStudy = string;
export type AgeRange = "1821" | "2225" | "26plus";
export type SocietyCategory = string;
export type Interest = string;
export type Location = "onCampus" | "offCampus";

export type Criterion = keyof SCriteria;
export type SearchFeatures = SCriteria;
