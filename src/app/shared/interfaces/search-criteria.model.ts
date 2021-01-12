export interface searchCriteriaFromDatabase {
  university: University | null; // select
  areaOfStudy: AreaOfStudy | null; // select
  ageRange: AgeRange | null; // slider
  societyCategory: SocietyCategory | null; // select
  interest: Interest | null; // select
  location: Location | null; // radio button
}

export interface SearchFeatures {
  university: University;
  areaOfStudy: AreaOfStudy;
  ageRange: AgeRange;
  societyCategory: SocietyCategory; // CHANGE TO ARRAY IF ITS POSSIBLE TO SELECT MULTIPLE SOCIETES
  interest: Interest[];
  location: Location;
}

export const searchCriteriaOptions = {
  university: ["UCL"] as const,
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

export type University = typeof searchCriteriaOptions.university[number];
export type AreaOfStudy = typeof searchCriteriaOptions.areaOfStudy[number]; //MOCK DATA
export type AgeRange = typeof searchCriteriaOptions.ageRange[number];
export type SocietyCategory = typeof searchCriteriaOptions.societyCategory[number];
export type Interest = typeof searchCriteriaOptions.interest[number];
export type Location = typeof searchCriteriaOptions.location[number];

export type Criterion = keyof searchCriteriaFromDatabase;
