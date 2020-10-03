export interface SCriteria {
  // university?: University; // select
  areaOfStudy?: AreaOfStudy; // select
  ageRange?: AgeRange; // slider
  societyCategory?: SocietyCategory; // select
  interest?: Interest; // select
  location?: Location; // radio button
}

export const searchCriteriaOptions = {
  // university: ["UCL"],
  areaOfStudy: ["politics", "mathematics", "biology"] as const,
  ageRange: ["1821", "2225", "26plus"] as const,
  societyCategory: [
    "Debate Society",
    "Basketball Society",
    "Football Society",
    "3D Modelling Society",
    "Anime Society",
  ] as const,
  interest: [
    "sports guy",
    "herb connoisseur",
    "smart guy",
    "beastaLegend",
  ] as const,
  location: ["onCampus", "offCampus"] as const,
};

// export type University = typeof searchCriteriaOptions.university[number];
export type AreaOfStudy = typeof searchCriteriaOptions.areaOfStudy[number]; //MOCK DATA
export type AgeRange = typeof searchCriteriaOptions.ageRange[number];
export type SocietyCategory = typeof searchCriteriaOptions.societyCategory[number];
export type Interest = typeof searchCriteriaOptions.interest[number];
export type Location = typeof searchCriteriaOptions.location[number];

export type Criterion = keyof SCriteria;
export type SearchFeatures = SCriteria;
