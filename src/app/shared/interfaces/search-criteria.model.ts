import { universityList } from "./universities.model";

// DO NOT ADD ANY FIELDS
export const searchCriteriaOptions = {
  university: universityList,

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
  interests: [
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
    "Math Geek" as const,
    "Sports Knight" as const,
    "Club Goer" as const,
    "Casual Cupid" as const,
    "Spiritual" as const,
    "Activist" as const,
    "Hopeless Romantic" as const,
    "Radical" as const,
    "Raver" as const,
    "Music Nerd" as const,
  ],

  // onCampus: [true as const, false as const],
};

// CANNOT BE PLACED IN searchCriteriaOptions
export const assetsInterestsPath = [
  "/assets/interests/herbfriendly.svg",
  "/assets/interests/bookworm.svg",
  "/assets/interests/lifesaver.svg",
  "/assets/interests/cafedweller.svg",
  "/assets/interests/astrologist.svg",
  "/assets/interests/chef.svg",
  "/assets/interests/model.svg",
  "/assets/interests/tiktoker.svg",
  "/assets/interests/libraryfiend.svg",
  "/assets/interests/pubcrawler.svg",
  "/assets/interests/mathgeek.svg",
  "/assets/interests/sportsknight.svg",
  "/assets/interests/clubgoer.svg",
  "/assets/interests/casualcupid.svg",
  "/assets/interests/spiritual.svg",
  "/assets/interests/activist.svg",
  "/assets/interests/hopelessromantic.svg",
  "/assets/interests/radical.svg",
  "/assets/interests/raver.svg",
  "/assets/interests/musicnerd.svg",
] as const;

export type searchCriteria = {
  [k in keyof typeof searchCriteriaOptions]: typeof searchCriteriaOptions[k][number];
};

export function interestToPath(interest: Interests): string {
  return "/assets/interests/" + interest.toLowerCase().replace(/\s/g, "") + ".svg";
}

// Important for backend
export const searchCriteriaNames: (keyof searchCriteria)[] = [
  "university",
  "areaOfStudy",
  "degree",
  "societyCategory",
  "interests",
  // "onCampus",
];

export const searchFeatureNames = searchCriteriaNames;

// same as searchCriteria but some SC can be multiple i.e. for interests where
// we have an array of interests
export type SearchFeatures = Omit<searchCriteria, "interests"> & {
  interests: typeof searchCriteriaOptions["interests"][number][];
};

export type AreaOfStudy = typeof searchCriteriaOptions.areaOfStudy[number]; //MOCK DATA
export type Degree = typeof searchCriteriaOptions.degree[number];
export type SocietyCategory = typeof searchCriteriaOptions.societyCategory[number];
export type Interests = typeof searchCriteriaOptions.interests[number];
// export type InterestPath = typeof assetsInterestsPath[number];
// export type InterestAndPath = { name: Interests; path: InterestPath };
// export type OnCampus = typeof searchCriteriaOptions.onCampus[number];

export type Criterion = keyof typeof searchCriteriaOptions;
