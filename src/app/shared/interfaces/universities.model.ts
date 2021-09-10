export const universityList = ["UCL" as const, "KCL" as const];
export type UniversityName = typeof universityList[number];

export const universityEmailDomainList = ["ucl.ac.uk" as const, "kcl.ac.uk" as const];
export type UniversityEmailDomain = typeof universityEmailDomainList[number];

export const cityList = ["London" as const];
export type City = typeof cityList[number];

export const countryList = ["United Kingdom" as const];
export type Country = typeof countryList[number];

export interface UniversityInfo {
  name: UniversityName;
  emailDomain: UniversityEmailDomain;
  city: City;
  country: Country;
}

export interface universitiesAllowedDocument {
  list: UniversityInfo[];
}

export interface additionalEmailsAllowedDocument {
  list: string[];
}
