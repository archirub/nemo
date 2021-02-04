export interface searchCriteriaFromDatabase {
  university: University | null; // select
  areaOfStudy: AreaOfStudy | null; // select
  degree: Degree | null; // slider
  societyCategory: SocietyCategory | null; // select
  interest: Interest | null; // select
  onCampus: OnCampus | null;
}

export interface SearchFeatures {
  university: University;
  areaOfStudy: AreaOfStudy;
  degree: Degree;
  societyCategory: SocietyCategory; // CHANGE TO ARRAY IF ITS POSSIBLE TO SELECT MULTIPLE SOCIETES
  interests: Interest[];
  onCampus: OnCampus;
}

export const searchCriteriaOptions = {
  university: ["UCL"] as const,
  areaOfStudy: ["politics", "mathematics", "biology"] as const,
  degree: ["undergrad", "postgrad"] as const,
  societyCategory: [
    "Debate Society",
    "Basketball Society",
    "Football Society",
    "3D Modelling Society",
    "Anime Society",
  ] as const,
  interest: ["sports guy", "herb connoisseur", "smart guy", "beastaLegend"] as const,
  onCampus: [true, false] as const,
};

export type University = typeof searchCriteriaOptions.university[number];
export type AreaOfStudy = typeof searchCriteriaOptions.areaOfStudy[number]; //MOCK DATA
export type Degree = typeof searchCriteriaOptions.degree[number];
export type SocietyCategory = typeof searchCriteriaOptions.societyCategory[number];
export type Interest = typeof searchCriteriaOptions.interest[number];
export type OnCampus = typeof searchCriteriaOptions.onCampus[number];

export type Criterion = keyof searchCriteriaFromDatabase;
