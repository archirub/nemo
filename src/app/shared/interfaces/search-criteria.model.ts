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
  // though it's incorrect grammatically, keep interest property as "interest" and not as "interests"
  // as that allows for easy type checking
  interest: Interest[];
  onCampus: OnCampus;
}

export const searchCriteriaOptions = {
  university: ["UCL"] as const,
  areaOfStudy: [
    "Arts and Humanities",
    "Bartlett School",
    "Brain Sciences",
    "Engineering Sciences",
    "IOE",
    "Law",
    "Life sciences",
    "Maths and Physical Sciences",
    "Medical Sciences",
    "Social Sciences",
  ] as const,
  degree: ["undergrad", "postgrad"] as const,
  societyCategory: [
    "Academic",
    "Altruistic",
    "Arts",
    "Common Interests",
    "Cultural",
    "Departmental",
    "Faith and Spirituality",
    "Finance and Enterprise",
    "Political",
    "Student Media",
    "Science and Technology",
    "Sports",
  ] as const,
  interest: [
    "Herb Friendly",
    "Book Worm",
    "Life Saver",
    "Cafe Dweller",
    "Astrologist",
    "Chef",
    "Model",
    "Tik Toker",
    "Library Fiend",
    "Pub Crawler",
  ] as const,
  path: [
    "/assets/interests/herbfriendly.png",
    "/assets/interests/bookworm.png",
    "/assets/interests/lifesaver.png",
    "/assets/interests/cafedweller.png",
    "/assets/interests/astrologist.png",
    "/assets/interests/chef.png",
    "/assets/interests/model.png",
    "/assets/interests/tiktoker.png",
    "/assets/interests/libraryfiend.png",
    "/assets/interests/pubcrawler.png",
  ] as const,
  onCampus: [true, false] as const,
};

export const searchCriteriaNames: (keyof searchCriteriaFromDatabase)[] = [
  "university",
  "areaOfStudy",
  "degree",
  "societyCategory",
  "interest",
  "onCampus",
];

export type University = typeof searchCriteriaOptions.university[number];
export type AreaOfStudy = typeof searchCriteriaOptions.areaOfStudy[number]; //MOCK DATA
export type Degree = typeof searchCriteriaOptions.degree[number];
export type SocietyCategory = typeof searchCriteriaOptions.societyCategory[number];
export type Interest = typeof searchCriteriaOptions.interest[number];
export type Path = typeof searchCriteriaOptions.path[number];
export type InterestAndPath = { name: Interest; path: Path };
export type OnCampus = typeof searchCriteriaOptions.onCampus[number];

export type Criterion = keyof searchCriteriaFromDatabase;
