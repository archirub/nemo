import { mdFriendPickingFromDatabase } from "./../../../../src/app/shared/interfaces/match-data.model";
import {
  mdFromDatabase,
  searchCriteria,
  UniversityName,
  AreaOfStudy,
  SocietyCategory,
  Interests,
  profile,
  OnCampus,
  Degree,
  mdDatingPickingFromDatabase,
} from "../../../../src/app/shared/interfaces/index";

type datingPickingSnapshots =
  | FirebaseFirestore.DocumentSnapshot<mdDatingPickingFromDatabase>
  | FirebaseFirestore.DocumentSnapshot<mdFriendPickingFromDatabase>;
interface SearchCriteriaChecker {
  [key: string]: (criteria: any, feature: any) => boolean;
}

/**
 * Separates the profile objects in three groups: those that match exactly the
 * SC provided, those that match partially, and those that don't match at all
 *
 * @param datingPickingDocs
 * @param searchCriteria
 * @returns three lists of IDs, each corresponding to a different degree of match
 * of the target user's search criteria.
 */
export function searchCriteriaGrouping(
  datingPickingDocs: datingPickingSnapshots[],
  // eslint-disable-next-line no-shadow
  searchCriteria: searchCriteria
): datingPickingSnapshots[] {
  // removing null criteria
  Object.keys(searchCriteria).forEach(
    (k) => (searchCriteria as any)[k] === null && delete (searchCriteria as any)[k]
  );

  const numberOfSC = Object.keys(searchCriteria).length;

  // Creating an object that associates each search criteria type to the right
  // function that checks whether they are considered "equal" (sometimes that means
  // part of an array, sometimes just equal to a specific element)
  const SC_Checker: SearchCriteriaChecker = {};

  (Object.keys(searchCriteria) as (keyof searchCriteria)[]).forEach((SC) => {
    switch (SC) {
      case "university":
        SC_Checker[SC] = universityMatchCheck;
        break;
      case "areaOfStudy":
        SC_Checker[SC] = areaOfStudyMatchCheck;
        break;
      case "degree":
        SC_Checker[SC] = degreeMatchCheck;
        break;
      case "societyCategory":
        SC_Checker[SC] = societyCategoryMatchCheck;
        break;
      case "interests":
        SC_Checker[SC] = interestMatchCheck;
        break;
      case "onCampus":
        SC_Checker[SC] = onCampusMatchCheck;
        break;
    }
  });

  return orderBySC(datingPickingDocs, searchCriteria, SC_Checker);
}

/**
 * NOTE: this used to group profiles and send them as separate arrays as said below
 * but now flattens these arrays to return just one array, so there may be a more efficent
 * way of doing things but haven't had time for now
 * Separates profiles based on how many search criteria they match.
 * Those that match none are in the first array, and those that match perfectly
 * are in the last array.
 *
 * NOTE: here the length of the array of arrays is not equal to the # of SC + 1 (for no match),
 * indeed, the empty arrays are REMOVED.
 */
function orderBySC(
  profiles: datingPickingSnapshots[],
  // eslint-disable-next-line no-shadow
  searchCriteria: searchCriteria,
  SC_Checker: SearchCriteriaChecker
): datingPickingSnapshots[] {
  if (!profiles || !searchCriteria || !SC_Checker) return [];

  const SC_keys = Object.keys(searchCriteria) as (keyof searchCriteria)[];
  const numberOfGroups: number = SC_keys.length + 1;

  const sortedProfiles: datingPickingSnapshots[][] = Array.from({
    length: numberOfGroups,
  }).map(() => []);

  for (const profile_ of profiles) {
    let numberOfMatching = 0;

    const profileData = profile_.data();

    // Checks how many SC match with the search features
    if (profile_.exists && profileData) {
      for (const SC of SC_keys) {
        if (SC_Checker[SC](searchCriteria[SC], profileData.searchFeatures[SC])) {
          numberOfMatching++;
        }
      }
    }
    // Adding profile to array that corresponds to # of matching SC
    sortedProfiles[numberOfMatching].push(profile_);
  }

  return ([] as datingPickingSnapshots[]).concat.apply(
    [],
    sortedProfiles.filter((array) => array.length > 0)
  );
}

function universityMatchCheck(
  criteria: UniversityName,
  feature: UniversityName
): boolean {
  if (!criteria || !feature) return false;
  return criteria === feature;
}
function areaOfStudyMatchCheck(criteria: AreaOfStudy, feature: AreaOfStudy): boolean {
  if (!criteria || !feature) return false;
  return criteria === feature;
}
function degreeMatchCheck(criteria: Degree, feature: Degree): boolean {
  if (!criteria || !feature) return false;
  return criteria === feature;
}
function societyCategoryMatchCheck(
  criteria: SocietyCategory,
  feature: SocietyCategory
): boolean {
  if (!criteria || !feature) return false;
  return criteria === feature;
}
function interestMatchCheck(criteria: Interests, feature: Interests[]): boolean {
  if (!criteria || !feature) return false;
  for (const f of feature) {
    if (criteria === f) return true;
  }
  return false;
}
function onCampusMatchCheck(criteria: OnCampus, feature: OnCampus): boolean {
  if (!criteria || !feature) return false;
  return criteria === feature;
}
