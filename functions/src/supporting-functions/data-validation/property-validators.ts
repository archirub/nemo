import {
  AreaOfStudy,
  Degree,
  SocietyCategory,
  swipeChoice,
  searchCriteriaOptions,
  questionsOptions,
  sexualPreferenceOptions,
  socialMediaOptions,
  Gender,
  genderOptions,
  SexualPreference,
  SocialMediaLink,
  Interests,
  QuestionAndAnswer,
  UniversityName,
  swipeChoiceOptions,
  universityList,
} from "./../../../../src/app/shared/interfaces/index";

export function isNull(a: any): a is null {
  return a == null; // catches both undefined and null (due to the double instead of tripe equal)
}

export function isObject(v: any): v is Object {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function isString(a: any): a is string {
  return typeof a === "string";
}

export function isNumber(a: any): a is number {
  return typeof a === "number";
}

export function isBoolean(a: any): a is boolean {
  return a === false || a === true;
}

// to check whether date is in ISOstring format
export function isDateOfBirth(a: any): a is string {
  return !isNaN(Date.parse(a));
}

export function isAreaOfStudy(v: any): v is AreaOfStudy {
  const options = searchCriteriaOptions.areaOfStudy;
  return typeof v === "string" && options.includes(v as any);
}

export function isInterest(a: any): a is Interests {
  const options = searchCriteriaOptions.interests;

  return typeof a === "string" && options.includes(a as any);
}

export function isInterests(a: any): a is Interests[] {
  if (!Array.isArray(a)) return false;

  // eslint-disable-next-line no-param-reassign
  a = [...a]; // doing so because I imagine I could be tricked if someone simply
  // changed the length property to 0 to act like there is nothing in the array

  if (a.length === 0) return true;

  return a
    .map((v) => isInterest(v))
    .reduce((x, y) => {
      if (x === false) return x;
      return y;
    });
}

export function isSocietyCategory(v: any): v is SocietyCategory {
  const options = searchCriteriaOptions.societyCategory;
  return typeof v === "string" && options.includes(v as any);
}

export function isQuestions(a: any): a is QuestionAndAnswer[] {
  const options = questionsOptions;

  if (!Array.isArray(a)) return false;

  for (const el of a) {
    for (const key in el) {
      if (!["question", "answer"].includes(key)) return false;
      if (typeof el[key] !== "string") return false;
      if (key === "question" && !options.includes(el[key])) return false;
    }
  }

  return true;
}

export function isSexualPreference(a: any): a is SexualPreference {
  const options = sexualPreferenceOptions;

  if (!Array.isArray(a)) return false;

  let found = false;
  for (const option of options) {
    if (JSON.stringify(option.sort()) === JSON.stringify(a.sort())) {
      found = true;
    }
  }
  if (!found) return false;
  return true;
}

export function isSocialMediaLinks(a: any): a is SocialMediaLink[] {
  const options = socialMediaOptions;
  if (!Array.isArray(a)) return false;

  for (const el of a) {
    for (const key in el) {
      if (!["socialMedia", "link"].includes(key)) return false;
      if (key === "socialMedia" && !options.includes(el[key])) return false;
    }
  }
  return true;
}

export function isGender(a: any): a is Gender {
  const options = genderOptions;
  return typeof a === "string" && options.includes(a as any);
}

// for this type check, you first need to fetch the university options from the admin/universitiesAllowed document
export function isUniversity(a: any): a is UniversityName {
  const options = universityList;
  return typeof a === "string" && options.includes(a as any);
}

export function isDegree(a: any): a is Degree {
  return typeof a === "string" && searchCriteriaOptions.degree.includes(a as any);
}

export function isSwipeChoice(a: any): a is swipeChoice {
  return typeof a === "string" && swipeChoiceOptions.includes(a as any);
}
