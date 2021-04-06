// DO NOT ADD ANY FIELDS
export const searchCriteriaOptions = {
  university: ["UCL" as const, "KCL" as const],

  // DO NOT CHANGE
  degree: ["undergrad" as const, "postgrad" as const],
  areaOfStudy: [
    "Arts and Humanities" as const,
    "Bartlett School" as const,
    "Brain Sciences" as const,
    "Engineering Sciences" as const,
    "IOE" as const,
    "Law" as const,
    "Life sciences" as const,
    "Maths and Physical Sciences" as const,
    "Medical Sciences" as const,
    "Social Sciences" as const,
  ],
  societyCategory: [
    "Academic" as const,
    "Altruistic" as const,
    "Arts" as const,
    "Common Interests" as const,
    "Cultural" as const,
    "Departmental" as const,
    "Faith and Spirituality" as const,
    "Finance and Enterprise" as const,
    "Political" as const,
    "Student Media" as const,
    "Science and Technology" as const,
    "Sports" as const,
  ],
  interest: [
    "Herb Friendly" as const,
    "Book Worm" as const,
    "Life Saver" as const,
    "Cafe Dweller" as const,
    "Astrologist" as const,
    "Chef" as const,
    "Model" as const,
    "Tik Toker" as const,
    "Library Fiend" as const,
    "Pub Crawler" as const,
  ],

  onCampus: [true as const, false as const],
};

// CANNOT BE PLACED IN searchCriteriaOptions
export const assetsInterestsPath = [
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
] as const;

export type searchCriteria = {
  [k in keyof typeof searchCriteriaOptions]: typeof searchCriteriaOptions[k][number];
};

// Important for backend
export const searchCriteriaNames: (keyof searchCriteria)[] = [
  "university",
  "areaOfStudy",
  "degree",
  "societyCategory",
  "interest",
  "onCampus",
];

// same as searchCriteria but some SC can be multiple i.e. for interest where
// we have an array of interest
export type SearchFeatures = Omit<searchCriteria, "interest"> & {
  interest: typeof searchCriteriaOptions["interest"][number][];
};

export type University = typeof searchCriteriaOptions.university[number];
export type AreaOfStudy = typeof searchCriteriaOptions.areaOfStudy[number]; //MOCK DATA
export type Degree = typeof searchCriteriaOptions.degree[number];
export type SocietyCategory = typeof searchCriteriaOptions.societyCategory[number];
export type Interest = typeof searchCriteriaOptions.interest[number];
export type Path = typeof assetsInterestsPath[number];
export type InterestAndPath = { name: Interest; path: Path };
export type OnCampus = typeof searchCriteriaOptions.onCampus[number];

export type Criterion = keyof typeof searchCriteriaOptions;
