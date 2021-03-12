// DO NOT ADD ANY FIELDS
export const searchCriteriaOptions = {
  university: ["UCL"] as const,

  // DO NOT CHANGE
  degree: ["undergrad", "postgrad"] as const,
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

  onCampus: [true, false] as const,
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
